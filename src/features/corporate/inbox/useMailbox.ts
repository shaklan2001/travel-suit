"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_ARRIVAL_GAP_MS, demoMailboxMails, parseRawEmail } from "../../../data/demo-mailbox";
import { MAX_PASTED_EMAIL_CHARACTERS } from "../../../data/corporate-desk";
import {
  caseCodeFor,
  senderName,
  composeThreadText,
  looksLikeTravelMail,
  stripQuotedReply,
  triageMail,
  type InboxMail,
  type MailDecision,
  type MailOutcome,
} from "../../../data/inbox-triage";
import { decisionFromFleet, fleetFailureDecision } from "../../../data/live-triage";
import type { FleetRun } from "../../../lib/fleet/types";

/**
 * Off for the demo: "Connect Gmail" opens the demo mailbox and never calls Google.
 * The OAuth routes under src/app/api/gmail stay in place for the real integration.
 * Flip this to true once they are configured.
 */
const LIVE_GMAIL = false;

export const DEMO_MAILBOX_ADDRESS = "corporatetravel@company.com";

export type MailboxSource = "none" | "gmail" | "demo";

export interface InboxItem {
  mail: InboxMail;
  /** Null while the fleet is still reading the mail. */
  decision: MailDecision | null;
  read: boolean;
  starred: boolean;
  /** The reporting manager's answer on a confirmed trip. Null until they answer. */
  approval: ManagerVerdict | null;
  /** Set when the desk sent the fleet's reply by itself. */
  sent: SentReply | null;
  /** Set when a person closes the exception: what they did. The case then counts as Handled. */
  resolution: string | null;
}

export type ManagerVerdict = "approved" | "rejected";

export interface SentReply {
  subject: string | null;
  body: string;
  sentAt: string;
}

export interface MailboxToast {
  id: number;
  text: string;
}

/** While the page is open the desk checks Gmail on this cadence. */
export const POLL_INTERVAL_MS = 30_000;
/** Short visible "reading" beat so a person can see a new mail being picked up. */
const READING_BEAT_MS = 900;
const TOAST_MS = 4_000;
const MAX_KNOWN_IDS_SENT = 500;
/**
 * Tells the classifier what this mailbox is for. The inbox also receives personal and unrelated mail, which the
 * desk must ignore. The suppressReason prefix is how the desk tells "not travel" apart from an internal FYI.
 */
const DESK_BRIEF =
  "Desk: this mailbox is the corporate travel desk. Only corporate business-travel requests are actioned " +
  "(flights, changes, confirmations, cancellations). Classify normally. Internal FYIs and status notes about business " +
  "travel stay fyi_internal with a normal suppressReason. Only when the mail has nothing to do with corporate " +
  "business travel (personal chat, family, spam, marketing, other business) set primaryIntent to " +
  '"fyi_internal", shouldAct to false and suppressReason to "not_travel: <short reason>".';
/** Each travel mail is up to nine worker runs, so only a few go to the fleet at once. */
const MAX_PARALLEL_FLEET_RUNS = 3;

export function useMailbox() {
  const [source, setSource] = useState<MailboxSource>("none");
  const [mailboxAddress, setMailboxAddress] = useState<string | null>(null);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState<MailboxToast | null>(null);

  const knownIds = useRef<string[]>([]);
  const timers = useRef<number[]>([]);
  /** Bumped on every reset so a slow fleet answer cannot land on a different inbox. */
  const generation = useRef(0);
  /** Null until the server answers once. False means the fleet is not configured, so scripted triage is used. */
  const fleetAvailable = useRef<boolean | null>(null);
  const activeRuns = useRef(0);
  const waitingRuns = useRef<(() => void)[]>([]);

  const later = useCallback((callback: () => void, delay: number) => {
    timers.current.push(window.setTimeout(callback, delay));
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const showToast = useCallback(
    (text: string) => {
      const id = Date.now();
      setToast({ id, text });
      later(() => setToast((current) => (current?.id === id ? null : current)), TOAST_MS);
    },
    [later],
  );

  const resetInbox = useCallback(() => {
    clearTimers();
    generation.current += 1;
    knownIds.current = [];
    setItems([]);
    setToast(null);
  }, [clearTimers]);

  const updateItem = useCallback((id: string, change: (item: InboxItem) => InboxItem) => {
    setItems((current) => current.map((item) => (item.mail.id === id ? change(item) : item)));
  }, []);

  /** Holds a mail back until fewer than MAX_PARALLEL_FLEET_RUNS are in flight. */
  const withFleetSlot = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    if (activeRuns.current >= MAX_PARALLEL_FLEET_RUNS) {
      await new Promise<void>((resolve) => waitingRuns.current.push(resolve));
    }
    activeRuns.current += 1;
    try {
      return await task();
    } finally {
      activeRuns.current -= 1;
      waitingRuns.current.shift()?.();
    }
  }, []);

  /** Real fleet first. Scripted triage only for non-travel mail or when the server has no fleet configured. */
  const decide = useCallback(
    async (mail: InboxMail): Promise<MailDecision> => {
      const latestBody = stripQuotedReply(mail.body);
      if (fleetAvailable.current === false || !looksLikeTravelMail(mail.subject, latestBody)) {
        return triageMail(mail);
      }

      const caseCode = caseCodeFor(mail.threadKey);
      // Mails say "12 Oct" with no year, so the workers need the day it arrived to pick the right one.
      const received = new Date(mail.receivedAt).toDateString();
      const emailText = `${DESK_BRIEF}\nReceived: ${received}\n${composeThreadText(mail, latestBody)}`.slice(0, MAX_PASTED_EMAIL_CHARACTERS);
      try {
        const response = await fetch("/api/desk/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailText }),
        });
        if (response.status === 503) {
          fleetAvailable.current = false;
          return triageMail(mail);
        }
        if (response.status === 429) {
          return fleetFailureDecision(caseCode, "The desk is reading too many mails at once. Reopen this mail in a minute.");
        }
        if (!response.ok) {
          return fleetFailureDecision(caseCode, "The Vibrium fleet could not finish reading this mail.");
        }
        fleetAvailable.current = true;
        const { run } = (await response.json()) as { run: FleetRun };
        return decisionFromFleet(caseCode, run);
      } catch {
        return fleetFailureDecision(caseCode, "Could not reach the desk server to read this mail.");
      }
    },
    [],
  );

  /** Every new mail is added as "reading", then the fleet decides the path. No button. */
  const receive = useCallback(
    (mails: InboxMail[]) => {
      const fresh = mails.filter((mail) => !knownIds.current.includes(mail.id));
      if (fresh.length === 0) {
        return;
      }
      knownIds.current = [...knownIds.current, ...fresh.map((mail) => mail.id)];
      const arrivals = fresh.map((mail) => ({ mail, decision: null, read: false, starred: false, approval: null, sent: null, resolution: null }));
      setItems((current) => sortNewestFirst([...arrivals, ...current]));

      const forGeneration = generation.current;
      for (const mail of fresh) {
        later(() => {
          void withFleetSlot(() => decide(mail)).then((decision) => {
            if (generation.current !== forGeneration) {
              return;
            }
            const sent = autoSend(decision);
            updateItem(mail.id, (item) =>
              item.decision === null
                ? { ...item, decision, sent, resolution: sent && decision.outcome === "draft_ready" ? AUTO_SENT_RESOLUTION : item.resolution }
                : item,
            );
            if (sent) {
              showToast(`Anika replied to ${senderName(mail.from)}`);
            }
          });
        }, READING_BEAT_MS);
      }
    },
    [decide, later, showToast, updateItem, withFleetSlot],
  );

  const pollGmail = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/gmail/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knownIds: knownIds.current.slice(-MAX_KNOWN_IDS_SENT) }),
      });
      if (response.status === 401) {
        setSource("none");
        resetInbox();
        return;
      }
      if (!response.ok) {
        showToast("Gmail did not answer. Trying again on the next check.");
        return;
      }
      const payload = (await response.json()) as { mailbox: string; mails: InboxMail[] };
      setMailboxAddress(payload.mailbox);
      receive(payload.mails);
    } catch {
      showToast("Could not reach the desk server. The next check will retry.");
    } finally {
      setChecking(false);
    }
  }, [receive, resetInbox, showToast]);

  useEffect(() => {
    if (!LIVE_GMAIL) {
      return;
    }
    let cancelled = false;
    fetch("/api/gmail/status")
      .then((response) => (response.ok ? (response.json() as Promise<{ connected: boolean; email: string | null }>) : null))
      .then((status) => {
        if (!cancelled && status?.connected) {
          setMailboxAddress(status.email);
          setSource("gmail");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (source !== "gmail") {
      return;
    }
    void pollGmail();
    const interval = window.setInterval(() => void pollGmail(), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [source, pollGmail]);

  useEffect(() => clearTimers, [clearTimers]);

  const startDemo = useCallback(() => {
    resetInbox();
    setSource("demo");
    setMailboxAddress(DEMO_MAILBOX_ADDRESS);
    demoMailboxMails().forEach((mail, index) => {
      later(() => receive([{ ...mail, receivedAt: new Date().toISOString() }]), 400 + index * DEMO_ARRIVAL_GAP_MS);
    });
  }, [later, receive, resetInbox]);

  const connect = useCallback(() => {
    if (LIVE_GMAIL) {
      window.location.assign("/api/gmail/connect");
      return;
    }
    startDemo();
  }, [startDemo]);

  const disconnect = useCallback(async () => {
    if (source === "gmail") {
      await fetch("/api/gmail/disconnect", { method: "POST" }).catch(() => undefined);
    }
    resetInbox();
    setMailboxAddress(null);
    setSource("none");
  }, [resetInbox, source]);

  const deliverTestMail = useCallback(
    (raw: string) => {
      receive([parseRawEmail(raw, `test-${Date.now()}`)]);
      showToast("Test mail delivered to the inbox.");
    },
    [receive, showToast],
  );

  const markRead = useCallback((id: string) => updateItem(id, (item) => ({ ...item, read: true })), [updateItem]);

  const toggleStar = useCallback(
    (id: string) => updateItem(id, (item) => ({ ...item, starred: !item.starred })),
    [updateItem],
  );

  /**
   * The manager's answer. Approve releases the held payload to TravelOne. Reject closes the case.
   * In the demo this button stands in for the manager's reply mail, which the fleet reads on the same case.
   */
  const decideApproval = useCallback(
    (id: string, verdict: ManagerVerdict) => {
      updateItem(id, (item) => ({
        ...item,
        approval: verdict,
        resolution: verdict === "rejected" ? "Manager rejected the fare. Nothing was ticketed" : item.resolution,
      }));
      showToast(verdict === "approved" ? "Manager approved. Payload released to TravelOne" : "Manager rejected. Case closed");
    },
    [showToast, updateItem],
  );

  /** The human step on an exception. The case moves to Handled and records what the person did. */
  const resolve = useCallback(
    (id: string, resolution: string, toastText: string) => {
      updateItem(id, (item) => ({ ...item, resolution }));
      showToast(toastText);
    },
    [showToast, updateItem],
  );

  return {
    source,
    mailboxAddress,
    items,
    checking,
    toast,
    dismissToast: () => setToast(null),
    checkNow: pollGmail,
    connect,
    disconnect,
    deliverTestMail,
    markRead,
    toggleStar,
    resolve,
    decideApproval,
  };
}

const AUTO_SENT_RESOLUTION = "Reply sent automatically by Anika";

/**
 * The desk answers on its own when the fleet has a clean reply and raised no exception: a quotation,
 * a clarifying question, a fare-change notice, a cancellation acknowledgement or the "sent for approval" note. Escalations, policy
 * blocks and the TravelOne ticketing handoff come back as "needs you" and are never sent. Only replies
 * from the live fleet are sent. The demo inbox has no outbound mail, so this records the send, not an email.
 */
function autoSend(decision: MailDecision): SentReply | null {
  if ((decision.outcome !== "draft_ready" && decision.outcome !== "awaiting_approval") || !decision.live || !decision.draftReply) {
    return null;
  }
  return { subject: decision.live.replySubject, body: decision.draftReply, sentAt: new Date().toISOString() };
}

export function outcomeOf(item: InboxItem): MailOutcome | null {
  if (!item.decision) {
    return null;
  }
  if (item.resolution) {
    return "handled";
  }
  // Approved: the desk has its approval, and ticketing on TravelOne is the one step left for a person.
  if (item.decision.outcome === "awaiting_approval" && item.approval === "approved") {
    return "needs_you";
  }
  return item.decision.outcome;
}

function sortNewestFirst(items: InboxItem[]): InboxItem[] {
  return [...items].sort((left, right) => right.mail.receivedAt.localeCompare(left.mail.receivedAt));
}
