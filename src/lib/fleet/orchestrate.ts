import { AGENT_SLOTS, getAgentId, type AgentSlot } from "../vibrium/config";
import { mockTravelOneRevalidate, mockTravelOneSearch } from "./travelone-mock";
import type { FleetPath, FleetRun, FleetStep, JsonObject } from "./types";
import { runWorker } from "./worker";

/**
 * The corporate desk flow, ported from the travel planner prototype.
 *
 *   classify -> extract -> link case -> policy -> search + quote -> (revalidate -> booking payload)
 *   -> reply -> next actions
 *
 * The path adapts: FYI and duplicates stop early, missing fields ask before searching, policy
 * blocks and cancellations skip search, and revalidation plus the booking payload only run once
 * the traveller has confirmed an option. Nothing here ticketed anything. The payload is a handoff.
 */

const STEP_TIMEOUT_MS = 3 * 60 * 1000;

const SUPPRESS_SKIPS: AgentSlot[] = [
  "email_extractor",
  "case_linker",
  "policy_guard",
  "flight_options",
  "fare_revalidator",
  "booking_payload",
];
const NO_SEARCH_SKIPS: AgentSlot[] = ["flight_options", "fare_revalidator", "booking_payload"];

const lower = (value: unknown) => String(value ?? "").toLowerCase();
const asList = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);

class Run {
  readonly steps: FleetStep[] = AGENT_SLOTS.map((key) => ({ key, status: "idle" }));

  private find(slot: AgentSlot): number {
    return this.steps.findIndex((step) => step.key === slot);
  }

  async exec(slot: AgentSlot, input: JsonObject): Promise<JsonObject> {
    const index = this.find(slot);
    const startedAt = Date.now();
    this.steps[index] = { ...this.steps[index], status: "running" };
    try {
      const { executionId, result } = await runWorker(getAgentId(slot), input, STEP_TIMEOUT_MS);
      this.steps[index] = {
        ...this.steps[index],
        status: "completed",
        executionId,
        latencyMs: Date.now() - startedAt,
      };
      return result;
    } catch (error) {
      this.steps[index] = {
        ...this.steps[index],
        status: "failed",
        error: error instanceof Error ? error.message : "failed",
        latencyMs: Date.now() - startedAt,
      };
      throw error;
    }
  }

  skip(slots: AgentSlot[], reason: string): void {
    for (const slot of slots) {
      const index = this.find(slot);
      if (this.steps[index].status === "idle") {
        this.steps[index] = { ...this.steps[index], status: "skipped", skippedReason: reason };
      }
    }
  }
}

export async function runDeskFleet(emailText: string, priorCaseJson = ""): Promise<FleetRun> {
  const run = new Run();
  const json = JSON.stringify;

  const classification = await run.exec("email_classifier", {
    email_text: emailText,
    prior_case_summary: priorCaseJson,
  });
  const intent = lower(classification.primaryIntent);
  const routing = String(classification.routingDecision || "");

  /** Every early exit ends the same way: compose the reply, then ask the orchestrator what is next. */
  async function closeOut(
    path: FleetPath,
    replyHint: string,
    collected: JsonObject,
    extra: JsonObject = {},
  ): Promise<FleetRun> {
    const reply = await run.exec("reply_composer", {
      situation_json: json(collected),
      reply_type_hint: replyHint,
    });
    const orchestration = await run.exec("orchestrator", {
      pipeline_json: json({ ...collected, reply, ...extra }),
    });
    return { path, steps: run.steps, ...collected, reply, orchestration } as FleetRun;
  }

  if (
    classification.shouldAct === false ||
    routing === "suppress_fyi" ||
    routing === "suppress_duplicate" ||
    intent === "fyi_internal" ||
    intent === "duplicate"
  ) {
    run.skip(SUPPRESS_SKIPS, "Classifier suppressed automation");
    // Personal and unrelated mail gets no reply and no next actions: nothing for the desk to do.
    if (lower(classification.suppressReason).startsWith("not_travel")) {
      run.skip(["reply_composer", "orchestrator"], "Not corporate travel");
      return { path: "suppressed", steps: run.steps, classification };
    }
    return closeOut("suppressed", "no_action_ack", { classification }, { suppressed: true });
  }

  const extraction = await run.exec("email_extractor", {
    email_text: emailText,
    classification_json: json(classification),
  });

  const caseLink = await run.exec("case_linker", {
    email_text: emailText,
    extraction_json: json(extraction),
    prior_case_json: priorCaseJson,
  });

  if (caseLink.blockParallelBooking === true && priorCaseJson) {
    run.skip(
      ["policy_guard", "flight_options", "fare_revalidator", "booking_payload"],
      "Parallel booking blocked by case linker",
    );
    return closeOut("duplicate_blocked", "escalation_notice", { classification, extraction, caseLink });
  }

  const policy = await run.exec("policy_guard", { extraction_json: json(extraction) });

  const isConfirmation = intent === "confirmation" || lower(extraction.intent) === "confirmation";
  const isCancellation = intent === "cancellation" || lower(extraction.intent) === "cancellation";

  // Only trip-defining gaps block a search. Optional policy fields (cost centre and so on) do not.
  const criticalMissing = asList(extraction.missingFields).filter((field) => {
    const name = field.toLowerCase().replace(/[_\s]/g, "");
    return (
      name.includes("origin") ||
      name.includes("destination") ||
      name.includes("departuredate") ||
      name.includes("traveldate") ||
      name === "date"
    );
  });
  const hasRouteAndDate = Boolean(
    (extraction.originAirport || extraction.originCity) &&
      (extraction.destinationAirport || extraction.destinationCity) &&
      extraction.departureDate,
  );

  // An incomplete trip is clarified before anything else, even when policy would also object.
  if (!isConfirmation && !isCancellation && (criticalMissing.length > 0 || !hasRouteAndDate)) {
    run.skip(NO_SEARCH_SKIPS, "Missing fields. Clarify before search");
    return closeOut(
      "clarify",
      "clarification",
      { classification, extraction, caseLink, policy },
      { needsClarify: true },
    );
  }

  if (policy.policyStatus === "blocked" || isCancellation) {
    run.skip(NO_SEARCH_SKIPS, isCancellation ? "Cancellation path" : "Policy blocked");
    return closeOut(
      isCancellation ? "cancellation" : "policy_blocked",
      isCancellation ? "cancellation_ack" : "escalation_notice",
      { classification, extraction, caseLink, policy },
    );
  }

  const travelOne: NonNullable<FleetRun["travelOne"]> = { search: mockTravelOneSearch(extraction) };

  const options = await run.exec("flight_options", {
    extracted_request_json: json(extraction),
    policy_json: json(policy),
    search_api_json: json(travelOne.search),
  });

  let revalidation: JsonObject | undefined;
  let booking: JsonObject | undefined;

  if (isConfirmation) {
    const selected = String(options.confirmedOptionId || options.recommendedOptionId || "");
    travelOne.revalidate = mockTravelOneRevalidate(options, selected || undefined);

    revalidation = await run.exec("fare_revalidator", {
      extraction_json: json(extraction),
      options_json: json(options),
      selected_option_id: selected,
    });

    if (revalidation.proceedToBooking === true) {
      booking = await run.exec("booking_payload", {
        extraction_json: json(extraction),
        options_json: json(options),
        revalidation_json: json(revalidation),
        policy_json: json(policy),
        selected_option_id: selected,
      });
    } else {
      run.skip(["booking_payload"], "Revalidation blocked booking");
    }
  } else {
    run.skip(["fare_revalidator", "booking_payload"], "Revalidation runs after the traveller confirms");
  }

  const replyHint = !isConfirmation
    ? "quotation"
    : revalidation?.requiresTravellerReconfirmation
      ? "fare_change"
      : booking?.bookingReady
        ? "booking_progress"
        : "confirmation_ack";

  const collected: JsonObject = { classification, extraction, caseLink, policy, options, revalidation, booking };
  const reply = await run.exec("reply_composer", { situation_json: json(collected), reply_type_hint: replyHint });
  const orchestration = await run.exec("orchestrator", {
    pipeline_json: json({ ...collected, reply, travelOne }),
  });

  return {
    path: isConfirmation ? "confirmation" : intent === "modification" ? "modification" : "new_request",
    steps: run.steps,
    ...collected,
    reply,
    orchestration,
    travelOne,
  } as FleetRun;
}
