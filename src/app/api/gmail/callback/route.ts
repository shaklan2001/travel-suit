import { timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { cookieOptions, getGmailConfig, STATE_COOKIE } from "../../../../lib/gmail/config";
import { exchangeCode } from "../../../../lib/gmail/google";
import { redirectToDesk, writeSession } from "../../../../lib/gmail/routes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getGmailConfig();
  if (!config) {
    return redirectToDesk(request.url, "not_configured");
  }

  const params = request.nextUrl.searchParams;
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const returnedState = params.get("state");
  const code = params.get("code");

  if (params.get("error")) {
    return withStateCleared(redirectToDesk(config.appBaseUrl, "denied"));
  }
  if (!expectedState || !returnedState || !statesMatch(expectedState, returnedState)) {
    return withStateCleared(redirectToDesk(config.appBaseUrl, "state_mismatch"));
  }
  if (!code) {
    return withStateCleared(redirectToDesk(config.appBaseUrl, "error"));
  }

  try {
    const session = await exchangeCode(config, code);
    const response = withStateCleared(redirectToDesk(config.appBaseUrl, "connected"));
    writeSession(response, session, config);
    return response;
  } catch {
    return withStateCleared(redirectToDesk(config.appBaseUrl, "error"));
  }
}

function statesMatch(expected: string, returned: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(returned);
  return left.length === right.length && timingSafeEqual(left, right);
}

function withStateCleared(response: NextResponse): NextResponse {
  response.cookies.set(STATE_COOKIE, "", cookieOptions(0, "/api/gmail"));
  return response;
}
