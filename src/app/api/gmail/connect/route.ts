import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, getGmailConfig, STATE_COOKIE, STATE_MAX_AGE_SECONDS } from "../../../../lib/gmail/config";
import { consentUrl } from "../../../../lib/gmail/google";
import { redirectToDesk } from "../../../../lib/gmail/routes";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const config = getGmailConfig();
  if (!config) {
    return redirectToDesk(request.url, "not_configured");
  }

  const state = randomBytes(32).toString("hex");
  const response = NextResponse.redirect(consentUrl(config, state));
  response.cookies.set(STATE_COOKIE, state, cookieOptions(STATE_MAX_AGE_SECONDS, "/api/gmail"));
  return response;
}
