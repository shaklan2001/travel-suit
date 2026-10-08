/** First milestone. Booking and ticketing stay out until a real quote has been validated. */
export const CORPORATE_POC_NOTE =
  "Current milestone: understand the email, then TravelOne search (token, traveller, emulation, flight search), then a quotation. This preview does not call TravelOne. Fares are not stored. The booking API has not been shared.";

export const MIN_PASTED_EMAIL_CHARACTERS = 40;
export const MAX_PASTED_EMAIL_CHARACTERS = 8_000;

export type TravelIntent =
  | "new_request"
  | "confirmation"
  | "modification"
  | "clarification"
  | "fyi_internal"
  | "cancellation";

export interface FleetAgent {
  key: string;
  label: string;
  name: string;
}

export interface FleetStepResult {
  key: string;
  label: string;
  name: string;
  status: "ran" | "skipped";
  note: string;
}

export interface DeskPreview {
  intent: TravelIntent;
  pathSummary: string;
  humanNeeded: boolean;
  humanReason: string;
  steps: FleetStepResult[];
  bullets: string[];
}

export interface DeskPreviewError {
  message: string;
}

export const INTENT_LABELS: Record<TravelIntent, string> = {
  new_request: "New request",
  confirmation: "Confirmation",
  modification: "Modification",
  clarification: "Clarification",
  fyi_internal: "FYI suppress",
  cancellation: "Cancellation",
};

export const FLEET: FleetAgent[] = [
  { key: "email_classifier", label: "Classify & decide", name: "Intent Router" },
  { key: "email_extractor", label: "Extract travel details", name: "Aarav" },
  { key: "case_linker", label: "Link conversation / case", name: "Case Linker" },
  { key: "policy_guard", label: "Apply corporate policy", name: "Policy Guard" },
  { key: "flight_options", label: "Search & quotation", name: "Meera" },
  { key: "fare_revalidator", label: "Revalidate fare / seats", name: "Fare Revalidator" },
  { key: "booking_payload", label: "Build booking payload", name: "Sara" },
  { key: "reply_composer", label: "Compose traveller reply", name: "Anika" },
  { key: "orchestrator", label: "Next best actions", name: "Kabir" },
];

const AGENTS_THAT_RUN: Record<TravelIntent, readonly string[]> = {
  new_request: [
    "email_classifier",
    "email_extractor",
    "case_linker",
    "policy_guard",
    "flight_options",
    "reply_composer",
    "orchestrator",
  ],
  confirmation: [
    "email_classifier",
    "email_extractor",
    "case_linker",
    "policy_guard",
    "reply_composer",
    "orchestrator",
  ],
  modification: [
    "email_classifier",
    "email_extractor",
    "case_linker",
    "policy_guard",
    "flight_options",
    "reply_composer",
    "orchestrator",
  ],
  clarification: [
    "email_classifier",
    "email_extractor",
    "case_linker",
    "reply_composer",
    "orchestrator",
  ],
  fyi_internal: ["email_classifier", "case_linker"],
  cancellation: [
    "email_classifier",
    "email_extractor",
    "case_linker",
    "reply_composer",
    "orchestrator",
  ],
};

const PATH_SUMMARIES: Record<TravelIntent, string> = {
  new_request:
    "Classify, extract, link the case, apply policy, and draft the quotation. A live fare appears only after TravelOne search is connected.",
  confirmation:
    "The reply is a confirmation. Revalidation and the booking payload stay off until the search-and-quote milestone is validated.",
  modification:
    "Update the preference from the email, search again, and draft a revised quotation. The previous option is not ticketed.",
  clarification:
    "Missing fields blocked the search. The desk asks clarifying questions instead of guessing.",
  fyi_internal:
    "Classified as internal FYI. The desk does not auto-reply and does not book.",
  cancellation:
    "Stop booking work, acknowledge the traveller, and close the case.",
};

const HUMAN_GATE: Record<TravelIntent, { humanNeeded: boolean; humanReason: string }> = {
  new_request: {
    humanNeeded: false,
    humanReason: "Quotation is a draft. Nothing is ticketed until the traveller confirms.",
  },
  confirmation: {
    humanNeeded: true,
    humanReason: "Confirmation is understood. Fare revalidation and booking are later phases. Nothing is ticketed from this preview.",
  },
  modification: {
    humanNeeded: false,
    humanReason: "Revised quotation only. The earlier option stays unbooked.",
  },
  clarification: {
    humanNeeded: true,
    humanReason: "The EA still has to supply the missing date. Search stays off.",
  },
  fyi_internal: {
    humanNeeded: false,
    humanReason: "Noise is suppressed. No human reply is required.",
  },
  cancellation: {
    humanNeeded: false,
    humanReason: "Booking is stopped. The acknowledgement is a draft the desk can send.",
  },
};

const GENERIC_BULLETS: Record<TravelIntent, string[]> = {
  new_request: [
    "Intent classified as new_request",
    "Trip details extracted from the thread",
    "Corporate policy applied",
    "Quotation is drafted only after TravelOne search is connected",
    "Revalidation and booking are later phases",
  ],
  confirmation: [
    "Intent classified as confirmation",
    "Selected option is read from the earlier thread",
    "Fare revalidation is not run in this milestone",
    "Booking payload is not built. The booking schema is not available",
  ],
  modification: [
    "Intent classified as modification",
    "Updated preference extracted",
    "A revised quotation is drafted",
    "The previous option is not ticketed",
  ],
  clarification: [
    "Intent classified as clarification",
    "Flight search skipped",
    "Clarifying questions drafted for the sender",
  ],
  fyi_internal: [
    "Intent classified as fyi_internal",
    "No reply composed",
    "No search and no booking",
  ],
  cancellation: [
    "Intent classified as cancellation",
    "Booking work stopped",
    "Cancellation acknowledgement drafted",
  ],
};

const SKIP_NOTES: Record<string, string> = {
  email_extractor: "Not run on this path.",
  policy_guard: "Policy not evaluated on this path.",
  flight_options: "Search skipped — incomplete request, FYI, cancel, or confirmation of an existing option.",
  fare_revalidator: "Phase 3. Starts after search and quote are validated. Not called in this POC.",
  booking_payload: "Phase 4. The booking API has not been shared. The payload schema is not invented here.",
  reply_composer: "No reply on an FYI. The desk stays quiet on purpose.",
  orchestrator: "No next action beyond suppressing the thread.",
};

const MONTH_PATTERN =
  /\b(\d{1,2}\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b|\b20\d{2}-\d{2}-\d{2}\b/i;

export function classifyTravelEmail(emailText: string): TravelIntent {
  const normalized = emailText.toLowerCase();
  if (isFyiThread(normalized)) {
    return "fyi_internal";
  }
  if (isCancellationThread(normalized)) {
    return "cancellation";
  }
  if (isModificationThread(normalized)) {
    return "modification";
  }
  if (isConfirmationThread(normalized)) {
    return "confirmation";
  }
  if (!hasTravelDate(normalized)) {
    return "clarification";
  }
  return "new_request";
}

export function previewDeskEmail(emailText: string, scriptedBullets?: string[]): DeskPreview | DeskPreviewError {
  const trimmed = emailText.trim();
  if (trimmed.length < MIN_PASTED_EMAIL_CHARACTERS) {
    return { message: "Paste a fuller travel email first (at least a few lines)." };
  }
  if (trimmed.length > MAX_PASTED_EMAIL_CHARACTERS) {
    return { message: `Email is too long. Keep it under ${MAX_PASTED_EMAIL_CHARACTERS} characters.` };
  }

  const intent = classifyTravelEmail(trimmed);
  const gate = HUMAN_GATE[intent];
  const running = new Set(AGENTS_THAT_RUN[intent]);

  return {
    intent,
    pathSummary: PATH_SUMMARIES[intent],
    humanNeeded: gate.humanNeeded,
    humanReason: gate.humanReason,
    bullets: scriptedBullets ?? GENERIC_BULLETS[intent],
    steps: FLEET.map((agent) => toStep(agent, running.has(agent.key))),
  };
}

function toStep(agent: FleetAgent, didRun: boolean): FleetStepResult {
  if (didRun) {
    return { ...agent, status: "ran", note: "Ran on this path." };
  }
  return {
    ...agent,
    status: "skipped",
    note: SKIP_NOTES[agent.key] ?? "Skipped on purpose for this path.",
  };
}

function isFyiThread(normalized: string): boolean {
  const mentionsFyi = normalized.includes("fyi");
  const saysNoAction =
    normalized.includes("no booking") ||
    normalized.includes("no action") ||
    normalized.includes("fyi only");
  return mentionsFyi && saysNoAction;
}

function isCancellationThread(normalized: string): boolean {
  return (
    normalized.includes("do not book") ||
    normalized.includes("please cancel") ||
    normalized.includes("cancel this travel")
  );
}

function isModificationThread(normalized: string): boolean {
  return (
    normalized.includes("cheaper") ||
    normalized.includes("instead of") ||
    normalized.includes("morning option") ||
    normalized.includes("meeting moved")
  );
}

function isConfirmationThread(normalized: string): boolean {
  return (
    normalized.includes("please proceed") ||
    normalized.includes("proceed with") ||
    normalized.includes("please book the") ||
    normalized.includes("go ahead and book")
  );
}

function hasTravelDate(normalized: string): boolean {
  return MONTH_PATTERN.test(normalized);
}
