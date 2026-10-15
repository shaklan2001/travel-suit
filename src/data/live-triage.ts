import type { FleetPath, FleetRun, FlightOption, JsonObject } from "../lib/fleet/types";
import { FLEET, INTENT_LABELS, type FleetStepResult } from "./corporate-desk";
import { extractTripFromFleet, type ApprovalRequest, type MailDecision, type MailOutcome } from "./inbox-triage";

/**
 * Turns what the nine Vibrium workers returned into the decision the desk inbox shows.
 * Pure and browser-safe: the server route returns the raw run, this reads it.
 */

const PATH_LABELS: Record<FleetPath, string> = {
  suppressed: INTENT_LABELS.fyi_internal,
  duplicate_blocked: "Duplicate request",
  clarify: INTENT_LABELS.clarification,
  policy_blocked: "Policy block",
  cancellation: INTENT_LABELS.cancellation,
  new_request: INTENT_LABELS.new_request,
  modification: INTENT_LABELS.modification,
  confirmation: INTENT_LABELS.confirmation,
};

const PATH_SUMMARIES: Record<FleetPath, string> = {
  suppressed: "Classified as noise. The desk does not reply and does not book.",
  duplicate_blocked: "The case linker found an open request for the same trip, so a second booking was blocked.",
  clarify: "Trip details are missing, so the search was held back and a question is drafted.",
  policy_blocked: "Client policy blocks this request. Search and booking stay off until a person decides.",
  cancellation: "Booking work is stopped and an acknowledgement is drafted.",
  new_request: "Trip read, policy applied, TravelOne options ranked and a quotation drafted.",
  modification: "The changed preference is applied, options are searched again and a revised quotation is drafted.",
  confirmation: "Confirmation read. The fare is revalidated before any booking payload is prepared.",
};

const lower = (value: unknown): string => String(value ?? "").toLowerCase();
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];

export function flightOptionsOf(run: FleetRun): FlightOption[] {
  const raw = run.options?.options;
  return Array.isArray(raw) ? (raw as FlightOption[]) : [];
}

/** Below this the classifier is guessing, so a person reads the mail instead of the desk answering it. */
const MIN_CLASSIFIER_CONFIDENCE = 0.7;

export function decisionFromFleet(caseCode: string, run: FleetRun): MailDecision {
  const { path, classification, extraction, revalidation, booking, reply, orchestration } = run;

  // Personal, spam and unrelated mail: the desk says nothing and opens no case.
  if (path === "suppressed" && text(classification?.suppressReason).toLowerCase().startsWith("not_travel")) {
    return {
      outcome: "not_travel",
      caseCode: null,
      intentLabel: "Not a travel request",
      summary: "This mail is not about corporate travel, so the desk left it alone. No reply was sent and no case was opened.",
      automated: ["Read by Nisha", "Not corporate travel", "No reply, no case"],
      humanAction: null,
      nextAutomatic: null,
      draftReply: null,
      trip: null,
      preview: null,
      live: { run, steps: stepRows(run), replySubject: null },
    };
  }

  const confidence = Number(classification?.confidence);
  const unsure =
    path !== "suppressed" &&
    (lower(classification?.primaryIntent) === "human_intervention" ||
      (Number.isFinite(confidence) && confidence < MIN_CLASSIFIER_CONFIDENCE));
  const replyBody = text(reply?.body);
  const replySubject = text(reply?.subject) || null;

  const orchestratorFlagged = orchestration?.needsHumanIntervention === true || orchestration?.escalationRequired === true;
  const blocked = path === "policy_blocked" || path === "duplicate_blocked";
  // A confirmed trip is never released on the traveller's word alone. The reporting manager approves the exact fare.
  const awaitingApproval =
    path === "confirmation" &&
    revalidation?.requiresTravellerReconfirmation !== true &&
    (booking?.bookingReady === true || run.policy?.needsApprover === true);

  let outcome: MailOutcome;
  if (path === "suppressed") {
    outcome = "handled";
  } else if (blocked || unsure) {
    outcome = "needs_you";
  } else if (awaitingApproval) {
    outcome = "awaiting_approval";
  } else if (orchestratorFlagged) {
    outcome = "needs_you";
  } else if (replyBody) {
    outcome = "draft_ready";
  } else {
    outcome = "handled";
  }

  return {
    outcome,
    caseCode,
    intentLabel: PATH_LABELS[path],
    summary: text(orchestration?.summary) || text(classification?.summary) || PATH_SUMMARIES[path],
    automated: automatedSteps(run, caseCode),
    humanAction: humanActionFor(outcome, run, unsure),
    nextAutomatic: nextAutomaticFor(path, outcome, revalidation),
    // The desk stays quiet on noise, so a suppressed mail never shows a draft.
    draftReply: path === "suppressed" || !replyBody ? null : replyBody,
    trip: extraction ? extractTripFromFleet(extraction) : null,
    preview: null,
    live: { run, steps: stepRows(run), replySubject },
    approval: awaitingApproval ? approvalRequestFor(run) : null,
  };
}

function approvalRequestFor(run: FleetRun): ApprovalRequest {
  const payload = (run.booking?.payload ?? {}) as JsonObject;
  const trip = run.extraction ? extractTripFromFleet(run.extraction) : null;
  const fare = Number(run.revalidation?.revalidatedFare ?? payload.fare);
  const flight = [text(payload.airline), text(payload.flightNo)].filter(Boolean).join(" ");
  return {
    traveller: text(payload.travellerName) || text(run.extraction?.travellerName) || "Traveller",
    route: trip?.route ?? "",
    date: trip?.date ?? "",
    flight: flight || text(run.revalidation?.flightNo),
    fare: Number.isFinite(fare) && fare > 0 ? fare : null,
    costCentre: trip?.costCentre ?? null,
    reason: text(run.policy?.approverReason) || "Corporate travel needs the reporting manager's approval before ticketing.",
  };
}

function humanActionFor(outcome: MailOutcome, run: FleetRun, unsure: boolean): string | null {
  const { orchestration, path } = run;
  if (outcome === "handled" || outcome === "awaiting_approval") {
    return null;
  }
  if (unsure) {
    return "The fleet is not sure what this mail asks for, so it did not reply. Read it and decide.";
  }
  if (outcome === "needs_you") {
    return (
      text(orchestration?.escalationReason) ||
      list(orchestration?.blockers)[0] ||
      list(orchestration?.nextActions)[0] ||
      (path === "policy_blocked" ? "Review the policy block and decide how to proceed." : "Review this case and decide the next step.")
    );
  }
  return "Review and send the drafted reply. The mailbox is connected read-only, so the fleet cannot send it.";
}

function nextAutomaticFor(path: FleetPath, outcome: MailOutcome, revalidation: JsonObject | undefined): string | null {
  if (outcome === "awaiting_approval") {
    return "When the manager approves, the payload is released to TravelOne. If the fare moves, the manager approves again.";
  }
  if (outcome !== "draft_ready") {
    return null;
  }
  if (path === "new_request" || path === "modification") {
    return "When the traveller picks an option, the fleet revalidates the fare and prepares the booking payload on the same case.";
  }
  if (path === "clarify") {
    return "When the reply with the missing details lands, the fleet picks it up on the same case.";
  }
  if (path === "confirmation" && revalidation?.requiresTravellerReconfirmation) {
    return "The traveller has to accept the changed fare. The fleet resumes when they reply.";
  }
  return null;
}

function automatedSteps(run: FleetRun, caseCode: string): string[] {
  const done = new Set(run.steps.filter((step) => step.status === "completed").map((step) => step.key));
  const options = flightOptionsOf(run);
  const caseKey = text(run.caseLink?.caseKey);
  const lines: [boolean, string][] = [
    [done.has("email_classifier"), `Classified as ${PATH_LABELS[run.path].toLowerCase()}`],
    [done.has("email_extractor"), "Trip read from the full thread"],
    [done.has("case_linker"), `Linked to case ${caseCode}${caseKey ? ` (${caseKey})` : ""}`],
    [done.has("policy_guard"), `Policy ${text(run.policy?.policyStatus).replace(/_/g, " ") || "checked"}`],
    [done.has("flight_options"), options.length > 0 ? `${options.length} options ranked` : "Search returned no options"],
    [done.has("fare_revalidator"), `Fare revalidated: ${text(run.revalidation?.revalidationStatus).replace(/_/g, " ") || "done"}`],
    [done.has("booking_payload"), run.booking?.bookingReady === true ? "Booking payload ready" : "Booking payload held back"],
    [done.has("reply_composer") && run.path !== "suppressed", "Reply drafted by Anika"],
    [done.has("orchestrator"), "Next actions set by Kabir"],
  ];
  return lines.filter(([include]) => include).map(([, line]) => line);
}

function stepRows(run: FleetRun): FleetStepResult[] {
  return FLEET.map((agent) => {
    const step = run.steps.find((candidate) => candidate.key === agent.key);
    if (step?.status === "completed") {
      const seconds = step.latencyMs != null ? ` in ${(step.latencyMs / 1000).toFixed(1)}s` : "";
      return { ...agent, status: "ran", note: `Ran${seconds}.` };
    }
    return { ...agent, status: "skipped", note: step?.skippedReason || "Skipped on purpose for this path." };
  });
}

/** Shown when the fleet could not finish. Nothing is drafted, so a person reads the mail. */
export function fleetFailureDecision(caseCode: string, reason: string): MailDecision {
  return {
    outcome: "needs_you",
    caseCode,
    intentLabel: "Fleet unavailable",
    summary: reason,
    automated: ["Mail received"],
    humanAction: "Read the mail yourself. Nothing was drafted, searched or booked.",
    nextAutomatic: null,
    draftReply: null,
    trip: null,
    preview: null,
    live: null,
  };
}
