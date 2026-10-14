import { vibriumJson } from "../vibrium/auth";
import type { JsonObject } from "./types";

type ExecutionStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "timed_out";

interface AgentExecution {
  execution_id: string;
  agent_id: string;
  status: ExecutionStatus;
  result?: JsonObject;
  output?: JsonObject;
  error?: string;
}

const POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000;
const TERMINAL = new Set<ExecutionStatus>(["completed", "failed", "cancelled", "timed_out"]);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function resultOf(execution: AgentExecution): JsonObject {
  const payload = execution.result ?? execution.output;
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

/** Submits one worker execution and polls until it finishes. Returns the worker's JSON result. */
export async function runWorker(
  agentId: string,
  input: JsonObject,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ executionId: string; result: JsonObject }> {
  const started = await vibriumJson<AgentExecution>("/agent-executions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: agentId, input }),
  });

  const deadline = Date.now() + timeoutMs;
  let current = started;
  while (!TERMINAL.has(current.status)) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for agent ${agentId}`);
    }
    await sleep(POLL_INTERVAL_MS);
    current = await vibriumJson<AgentExecution>(
      `/agent-executions/${encodeURIComponent(started.execution_id)}`,
    );
  }

  if (current.status !== "completed") {
    throw new Error(current.error || `Agent execution ${current.status} (${current.execution_id})`);
  }
  return { executionId: current.execution_id, result: resultOf(current) };
}
