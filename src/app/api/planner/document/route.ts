import { NextResponse, type NextRequest } from "next/server";
import { overRateLimit } from "../../../../lib/fleet/rate-limit";
import { runWorker } from "../../../../lib/fleet/worker";
import { getVibriumConfig } from "../../../../lib/vibrium/config";
import type { WorkerCopy } from "../../../../data/trip-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_PROMPT_CHARACTERS = 600;
const MAX_CONTEXT_CHARACTERS = 6_000;
const REQUESTS_PER_MINUTE = 10;
const WORKER_TIMEOUT_MS = 90_000;

/** The Trip Document Designer worker id. When it is not set the studio composes the copy itself. */
function documentAgentId(): string | null {
  const id = process.env.VIBRIUM_AGENT_TRIP_DOCUMENT?.trim();
  if (!id) return null;
  try {
    getVibriumConfig();
    return id;
  } catch {
    return null;
  }
}

/**
 * Runs the Trip Document Designer worker on a prompt and the composed draft, and returns only
 * the copy it rewrites: title, intro, day narratives, and tips. Prices and facts stay with the suite.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const agentId = documentAgentId();
  if (!agentId) {
    // Not an error for the studio: it composes the copy itself.
    return NextResponse.json({ copy: null, worker: "not_configured" });
  }
  if (overRateLimit(request, "planner-document", REQUESTS_PER_MINUTE, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let prompt = "";
  let draft = "";
  try {
    const body = (await request.json()) as { prompt?: unknown; draft?: unknown };
    prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    draft = typeof body.draft === "string" ? body.draft : "";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARACTERS || draft.length === 0 || draft.length > MAX_CONTEXT_CHARACTERS) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const { result } = await runWorker(agentId, { prompt, draft }, WORKER_TIMEOUT_MS);
    return NextResponse.json({ copy: pickCopy(result) });
  } catch (error) {
    console.error("[planner/document]", error);
    return NextResponse.json({ error: "worker_failed" }, { status: 502 });
  }
}

/** Keeps only string fields of the expected shape, so the worker can never inject prices or markup. */
function pickCopy(result: Record<string, unknown>): WorkerCopy {
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : undefined);
  const days = Array.isArray(result.days)
    ? result.days.slice(0, 21).map((day) => {
        const entry = (day ?? {}) as Record<string, unknown>;
        return { title: text(entry.title, 80), text: text(entry.text, 600) };
      })
    : undefined;
  const tips = Array.isArray(result.tips) ? result.tips.map((tip) => text(tip, 200)).filter((tip): tip is string => Boolean(tip)).slice(0, 6) : undefined;
  return { title: text(result.title, 80), intro: text(result.intro, 900), days, tips };
}
