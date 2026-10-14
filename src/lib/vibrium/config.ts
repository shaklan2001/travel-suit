/**
 * Vibrium service credentials and worker agent ids for the corporate desk fleet.
 * Server only. Imported from route handlers; these values never reach the browser.
 */

export type AgentSlot =
  | "email_classifier"
  | "email_extractor"
  | "case_linker"
  | "policy_guard"
  | "flight_options"
  | "fare_revalidator"
  | "booking_payload"
  | "reply_composer"
  | "orchestrator";

export const AGENT_SLOTS: AgentSlot[] = [
  "email_classifier",
  "email_extractor",
  "case_linker",
  "policy_guard",
  "flight_options",
  "fare_revalidator",
  "booking_payload",
  "reply_composer",
  "orchestrator",
];

const SLOT_ENV: Record<AgentSlot, string> = {
  email_classifier: "VIBRIUM_AGENT_EMAIL_CLASSIFIER",
  email_extractor: "VIBRIUM_AGENT_EMAIL_EXTRACTOR",
  case_linker: "VIBRIUM_AGENT_CASE_LINKER",
  policy_guard: "VIBRIUM_AGENT_POLICY_GUARD",
  flight_options: "VIBRIUM_AGENT_FLIGHT_OPTIONS",
  fare_revalidator: "VIBRIUM_AGENT_FARE_REVALIDATOR",
  booking_payload: "VIBRIUM_AGENT_BOOKING_PAYLOAD",
  reply_composer: "VIBRIUM_AGENT_REPLY_COMPOSER",
  orchestrator: "VIBRIUM_AGENT_ORCHESTRATOR",
};

const DEFAULT_API_BASE_URL = "https://api-staging.vibrium.ai";

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function required(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getVibriumConfig() {
  const agentIds = {} as Record<AgentSlot, string>;
  for (const slot of AGENT_SLOTS) {
    agentIds[slot] = read(SLOT_ENV[slot]);
  }
  return {
    apiBaseUrl: (read("VIBRIUM_API_BASE_URL") || DEFAULT_API_BASE_URL).replace(/\/$/, ""),
    customerId: required("VIBRIUM_CUSTOMER_ID"),
    username: required("VIBRIUM_SERVICE_USERNAME"),
    password: required("VIBRIUM_SERVICE_PASSWORD"),
    agentIds,
  };
}

/** True only when credentials and all nine worker ids are set. Otherwise the desk keeps its scripted triage. */
export function fleetConfigured(): boolean {
  try {
    const { agentIds } = getVibriumConfig();
    return AGENT_SLOTS.every((slot) => Boolean(agentIds[slot]));
  } catch {
    return false;
  }
}

export function getAgentId(slot: AgentSlot): string {
  const id = getVibriumConfig().agentIds[slot];
  if (!id) {
    throw new Error(`Missing agent id for ${slot}`);
  }
  return id;
}
