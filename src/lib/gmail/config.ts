/**
 * Gmail connection for the corporate desk. Read-only: the fleet reads mail, it never sends.
 * Imported only from route handlers under src/app/api/gmail. Secrets never reach the browser.
 */

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export const SESSION_COOKIE = "gmail_session";
export const STATE_COOKIE = "gmail_oauth_state";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const STATE_MAX_AGE_SECONDS = 60 * 10;

/** Only recent inbox mail is triaged. Older threads stay with the desk as they are. */
export const INBOX_QUERY = "in:inbox newer_than:7d";
export const INBOX_PAGE_SIZE = 25;

const MIN_SECRET_LENGTH = 32;

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  appBaseUrl: string;
  sessionSecret: string;
}

/** Null until every variable in .env.example is set. The UI then says Gmail is not configured. */
export function getGmailConfig(): GmailConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appBaseUrl = process.env.APP_BASE_URL?.trim().replace(/\/+$/, "");
  const sessionSecret = process.env.GMAIL_SESSION_SECRET?.trim();

  if (!clientId || !clientSecret || !appBaseUrl || !sessionSecret || sessionSecret.length < MIN_SECRET_LENGTH) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    appBaseUrl,
    sessionSecret,
    redirectUri: `${appBaseUrl}/api/gmail/callback`,
  };
}

export function cookieOptions(maxAge: number, path = "/") {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path,
    maxAge,
  };
}
