import { DESK_SCENARIOS } from "./desk-scenarios";
import type { InboxMail } from "./inbox-triage";

/**
 * Demo mailbox. The six CT-BT threads plus the SOTC vanilla mail arrive one by one,
 * the way they would on a connected inbox. Nothing here is a real mailbox.
 */

const DEMO_THREAD_KEYS: Record<string, string> = {
  "vanilla-search": "demo-abc-del-bom-dec",
  "new-request": "demo-ananya-del-bom",
  confirmation: "demo-ananya-del-bom",
  modification: "demo-ananya-del-bom",
  clarification: "demo-vikram-blr-hyd",
  fyi: "demo-fyi-ananya",
  cancellation: "demo-ananya-del-bom",
};

/** Arrival order on the demo inbox: the thread plays out the way the desk would see it. */
const DEMO_ARRIVAL_ORDER = ["vanilla-search", "new-request", "clarification", "modification", "fyi", "confirmation", "cancellation"];

export const DEMO_ARRIVAL_GAP_MS = 4_000;

export function demoMailboxMails(): InboxMail[] {
  return DEMO_ARRIVAL_ORDER.flatMap((scenarioId): InboxMail[] => {
    const scenario = DESK_SCENARIOS.find((item) => item.id === scenarioId);
    if (!scenario) {
      return [];
    }
    return [
      {
        ...parseRawEmail(scenario.email, `demo-${scenario.id}`),
        threadKey: DEMO_THREAD_KEYS[scenario.id] ?? `demo-${scenario.id}`,
        scriptedBullets: scenario.bullets,
      },
    ];
  });
}

/** Reads From / To / Cc / Subject headers off the top of a pasted mail. Missing headers stay empty. */
export function parseRawEmail(raw: string, id: string): InboxMail {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const headers: Record<string, string> = {};
  let bodyStart = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(From|To|Cc|Subject):\s*(.*)$/i);
    if (!match) {
      bodyStart = lines[index].trim() === "" ? index + 1 : index;
      break;
    }
    headers[match[1].toLowerCase()] = match[2].trim();
    bodyStart = index + 1;
  }

  const subject = headers.subject || "(no subject)";
  return {
    id,
    threadKey: `pasted-${normalizeSubject(subject)}`,
    from: headers.from || "unknown@sender",
    to: headers.to || "",
    cc: headers.cc || "",
    subject,
    receivedAt: new Date().toISOString(),
    body: lines.slice(bodyStart).join("\n").trim(),
  };
}

function normalizeSubject(subject: string): string {
  return subject
    .replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
}
