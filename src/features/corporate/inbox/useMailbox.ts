"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_ARRIVAL_GAP_MS, demoMailboxMails, parseRawEmail } from "../../../data/demo-mailbox";
import { triageMail, type InboxMail, type MailDecision, type MailOutcome } from "../../../data/inbox-triage";

/**
 * Off for the demo: "Connect Gmail" opens the demo mailbox and never calls Google.
 * The OAuth routes under src/app/api/gmail stay in place for the real integration.
 * Flip this to true once they are configured.
 */
const LIVE_GMAIL = false;

export const DEMO_MAILBOX_ADDRESS = "corporatetravel@thomascook.in";

export type MailboxSource = "none" | "gmail" | "demo";

export interface InboxItem {
  mail: InboxMail;
  /** Null while the fleet is still reading the mail. */
  decision: MailDecision | null;
  read: boolean;
  starred: boolean;
  /** Set when a person closes the exception: what they did. The case then counts as Handled. */
  resolution: string | null;
}

export interface MailboxToast {
  id: number;
  text: string;
}

/** While the page is open the desk checks Gmail on this cadence. */
export const POLL_INTERVAL_MS = 30_000;
/** Short visible "reading" beat so a person can see a new mail being picked up. Triage itself is instant. */
const READING_BEAT_MS = 900;
const TOAST_MS = 4_000;
const MAX_KNOWN_IDS_SENT = 500;

export function useMailbox() {
  const [source, setSource] = useState<MailboxSource>("none");
  const [mailboxAddress, setMailboxAddress] = useState<string | null>(null);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState<MailboxToast | null>(null);

  const knownIds = useRef<string[]>([]);
  const timers = useRef<number[]>([]);

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
    knownIds.current = [];
    setItems([]);
    setToast(null);
  }, [clearTimers]);

  const updateItem = useCallback((id: string, change: (item: InboxItem) => InboxItem) => {
    setItems((current) => current.map((item) => (item.mail.id === id ? change(item) : item)));
  }, []);

  /** Every new mail is added as "reading", then the fleet decides the path. No button. */
  const receive = useCallback(
    (mails: InboxMail[]) => {
      const fresh = mails.filter((mail) => !knownIds.current.includes(mail.id));
      if (fresh.length === 0) {
        return;
      }
      knownIds.current = [...knownIds.current, ...fresh.map((mail) => mail.id)];
      const arrivals = fresh.map((mail) => ({ mail, decision: null, read: false, starred: false, resolution: null }));
      setItems((current) => sortNewestFirst([...arrivals, ...current]));
      later(() => {
        setItems((current) =>
          current.map((item) =>
            item.decision === null && fresh.some((mail) => mail.id === item.mail.id)
              ? { ...item, decision: triageMail(item.mail) }
              : item,
          ),
        );
      }, READING_BEAT_MS);
    },
    [later],
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
  };
}

export function outcomeOf(item: InboxItem): MailOutcome | null {
  if (!item.decision) {
    return null;
  }
  return item.resolution ? "handled" : item.decision.outcome;
}

function sortNewestFirst(items: InboxItem[]): InboxItem[] {
  return [...items].sort((left, right) => right.mail.receivedAt.localeCompare(left.mail.receivedAt));
}
