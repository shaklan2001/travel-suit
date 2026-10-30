import type { AgentSlot } from "../vibrium/config";

/** Shapes shared by the fleet route and the desk UI. Type-only, so safe to import in the browser. */

export type JsonObject = Record<string, unknown>;

export type FleetStepStatus = "idle" | "running" | "completed" | "failed" | "skipped";

export interface FleetStep {
  key: AgentSlot;
  status: FleetStepStatus;
  executionId?: string;
  latencyMs?: number;
  error?: string;
  skippedReason?: string;
}

/** Which branch of the desk flow the email took. */
export type FleetPath =
  | "suppressed"
  | "duplicate_blocked"
  | "clarify"
  | "policy_blocked"
  | "cancellation"
  | "new_request"
  | "modification"
  | "confirmation";

export interface FleetRun {
  path: FleetPath;
  steps: FleetStep[];
  classification?: JsonObject;
  extraction?: JsonObject;
  caseLink?: JsonObject;
  policy?: JsonObject;
  options?: JsonObject;
  revalidation?: JsonObject;
  booking?: JsonObject;
  reply?: JsonObject;
  orchestration?: JsonObject;
  travelOne?: { search?: JsonObject; revalidate?: JsonObject };
}

export interface FlightOption {
  optionId: string;
  airline: string;
  flightNo: string;
  departureTime: string;
  arrivalTime: string;
  duration?: string;
  fare: number;
  currency?: string;
  rationale?: string;
  fareFamily?: string;
  fareType?: string;
  fareRules?: FareRules;
}

/** What the traveller gives up or keeps on a fare. Fees are per passenger, per sector. */
export interface FareRules {
  family: string;
  refundable: boolean;
  cancellationFee: number;
  /** Charged on top of any fare difference. Zero means the date change itself is free. */
  rescheduleFee: number;
  checkInKg: number;
  cabinKg: number;
}
