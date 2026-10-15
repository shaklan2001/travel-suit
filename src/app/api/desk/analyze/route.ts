import { NextResponse, type NextRequest } from "next/server";
import { MAX_PASTED_EMAIL_CHARACTERS, MIN_PASTED_EMAIL_CHARACTERS } from "../../../../data/corporate-desk";
import { runDeskFleet } from "../../../../lib/fleet/orchestrate";
import { overRateLimit } from "../../../../lib/fleet/rate-limit";
import { fleetConfigured } from "../../../../lib/vibrium/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PRIOR_CASE_CHARACTERS = 4_000;
/** One travel mail costs up to nine worker runs, so the cap is low. */
const REQUESTS_PER_MINUTE = 15;

/**
 * Runs the Vibrium worker fleet on one mail and returns every agent's output.
 * The browser sends only the mail text. Credentials and agent ids stay on the server.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!fleetConfigured()) {
    return NextResponse.json({ error: "fleet_not_configured" }, { status: 503 });
  }
  if (overRateLimit(request, "desk-analyze", REQUESTS_PER_MINUTE, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const input = await readInput(request);
  if (!input) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const run = await runDeskFleet(input.emailText, input.priorCaseJson);
    return NextResponse.json({ run });
  } catch (error) {
    console.error("[desk/analyze]", error, error instanceof Error ? error.cause : "");
    return NextResponse.json({ error: "fleet_failed" }, { status: 502 });
  }
}

async function readInput(request: NextRequest): Promise<{ emailText: string; priorCaseJson: string } | null> {
  try {
    const body = (await request.json()) as { emailText?: unknown; priorCaseJson?: unknown };
    if (typeof body.emailText !== "string") {
      return null;
    }
    const emailText = body.emailText.trim();
    if (emailText.length < MIN_PASTED_EMAIL_CHARACTERS || emailText.length > MAX_PASTED_EMAIL_CHARACTERS) {
      return null;
    }
    const priorCaseJson = typeof body.priorCaseJson === "string" ? body.priorCaseJson : "";
    if (priorCaseJson.length > MAX_PRIOR_CASE_CHARACTERS) {
      return null;
    }
    return { emailText, priorCaseJson };
  } catch {
    return null;
  }
}
