import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, type GmailConfig } from "./config";
import { openSession, sealSession, type GmailSession } from "./session";

export const DESK_QUEUE_PATH = "/corporate/queue";

/** Outcome codes the queue page understands. Raw Google errors never reach the URL. */
export type ConnectOutcome = "connected" | "denied" | "not_configured" | "state_mismatch" | "error";

export function redirectToDesk(baseUrl: string, outcome: ConnectOutcome): NextResponse {
  const url = new URL(DESK_QUEUE_PATH, baseUrl);
  url.searchParams.set("gmail", outcome);
  return NextResponse.redirect(url);
}

export function readSession(request: NextRequest, config: GmailConfig): GmailSession | null {
  return openSession(request.cookies.get(SESSION_COOKIE)?.value, config.sessionSecret);
}

export function writeSession(response: NextResponse, session: GmailSession, config: GmailConfig): void {
  response.cookies.set(SESSION_COOKIE, sealSession(session, config.sessionSecret), cookieOptions(SESSION_MAX_AGE_SECONDS));
}

export function clearSession(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
}

/** State-changing calls must come from this app. SameSite=Lax already blocks most cross-site posts. */
export function isSameOrigin(request: NextRequest, config: GmailConfig): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(config.appBaseUrl).origin;
}
