import type { InboxMail } from "../../data/inbox-triage";
import { MAX_PASTED_EMAIL_CHARACTERS } from "../../data/corporate-desk";
import { GMAIL_SCOPE, INBOX_PAGE_SIZE, INBOX_QUERY, type GmailConfig } from "./config";
import type { GmailSession } from "./session";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Refresh a little early so a poll never runs on a token that expires mid-request. */
const ACCESS_TOKEN_SKEW_MS = 60_000;

export class GmailAuthError extends Error {}
export class GmailApiError extends Error {}

export function consentUrl(config: GmailConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (response.status === 400 || response.status === 401) {
    throw new GmailAuthError("Google rejected the token request.");
  }
  if (!response.ok) {
    throw new GmailApiError(`Token endpoint returned ${response.status}.`);
  }
  return (await response.json()) as TokenResponse;
}

export async function exchangeCode(config: GmailConfig, code: string): Promise<GmailSession> {
  const tokens = await postToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  );
  if (!tokens.refresh_token) {
    throw new GmailAuthError("Google did not return a refresh token.");
  }
  if (!tokens.scope?.split(" ").includes(GMAIL_SCOPE)) {
    throw new GmailAuthError("Gmail read access was not granted.");
  }
  const email = await fetchMailboxAddress(tokens.access_token);
  return {
    refreshToken: tokens.refresh_token,
    email,
    accessToken: tokens.access_token,
    accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
  };
}

/** Returns the same session when the access token is still good, or a refreshed copy. */
export async function ensureAccessToken(config: GmailConfig, session: GmailSession): Promise<GmailSession> {
  if (session.accessToken && session.accessTokenExpiresAt && session.accessTokenExpiresAt - ACCESS_TOKEN_SKEW_MS > Date.now()) {
    return session;
  }
  const tokens = await postToken(
    new URLSearchParams({
      refresh_token: session.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  );
  return {
    ...session,
    accessToken: tokens.access_token,
    accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
  };
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    cache: "no-store",
  }).catch(() => undefined);
}

async function gmailGet<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) {
    throw new GmailAuthError("Gmail refused the request.");
  }
  if (!response.ok) {
    throw new GmailApiError(`Gmail returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

async function fetchMailboxAddress(accessToken: string): Promise<string> {
  const profile = await gmailGet<{ emailAddress: string }>(accessToken, "/profile");
  return profile.emailAddress;
}

export async function listInboxIds(accessToken: string): Promise<string[]> {
  const params = new URLSearchParams({ q: INBOX_QUERY, maxResults: String(INBOX_PAGE_SIZE) });
  const page = await gmailGet<{ messages?: { id: string }[] }>(accessToken, `/messages?${params.toString()}`);
  return (page.messages ?? []).map((message) => message.id);
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  internalDate?: string;
  payload?: GmailPart;
}

export async function fetchInboxMail(accessToken: string, id: string, mailbox: string): Promise<InboxMail> {
  const message = await gmailGet<GmailMessage>(accessToken, `/messages/${encodeURIComponent(id)}?format=full`);
  const header = (name: string) =>
    message.payload?.headers?.find((item) => item.name.toLowerCase() === name)?.value?.trim() ?? "";

  return {
    id: message.id,
    threadKey: message.threadId,
    from: header("from"),
    to: header("to"),
    cc: header("cc"),
    subject: header("subject") || "(no subject)",
    receivedAt: new Date(Number(message.internalDate ?? Date.now())).toISOString(),
    body: readableBody(message.payload).slice(0, MAX_PASTED_EMAIL_CHARACTERS),
    sourceUrl: `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(mailbox)}#inbox/${encodeURIComponent(message.threadId)}`,
  };
}

function readableBody(payload: GmailPart | undefined): string {
  if (!payload) {
    return "";
  }
  const plain = findPart(payload, "text/plain");
  if (plain?.body?.data) {
    return decode(plain.body.data).trim();
  }
  const html = findPart(payload, "text/html");
  return html?.body?.data ? htmlToText(decode(html.body.data)) : "";
}

function findPart(part: GmailPart, mimeType: string): GmailPart | undefined {
  if (part.mimeType === mimeType && part.body?.data) {
    return part;
  }
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function decode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
