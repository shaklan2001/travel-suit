import { getVibriumConfig } from "./config";

/** Refresh a minute before the token expires. Tokens live about an hour. */
const REFRESH_MARGIN_MS = 60_000;
const DEFAULT_TOKEN_LIFETIME_MS = 55 * 60 * 1000;

/** Staging drops connections now and then under parallel polling. A failed connect is retried, not surfaced. */
const NETWORK_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = 600;

let cachedToken: string | null = null;
let expiresAtMs = 0;

function tokenFresh(): boolean {
  return Boolean(cachedToken) && Date.now() < expiresAtMs - REFRESH_MARGIN_MS;
}

function clearTokenCache(): void {
  cachedToken = null;
  expiresAtMs = 0;
}

/** fetch() that retries only when no HTTP response arrived at all. Any HTTP status is returned as is. */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, { ...init, cache: "no-store" });
    } catch (error) {
      if (attempt >= NETWORK_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * attempt));
    }
  }
}

async function mintServiceToken(): Promise<string> {
  const { apiBaseUrl, customerId, username, password } = getVibriumConfig();
  const basic = Buffer.from(`${username}:${password}`, "utf8").toString("base64");

  const response = await fetchWithRetry(`${apiBaseUrl}/v1/customers/${customerId}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    throw new Error(`Vibrium auth failed (${response.status})`);
  }

  const json = (await response.json()) as {
    data?: { token?: string; expires_at?: string; expiresAt?: string };
    token?: string;
  };
  const token = json.data?.token || json.token;
  if (!token) {
    throw new Error("Vibrium auth response missing token");
  }

  const expiresRaw = json.data?.expires_at || json.data?.expiresAt;
  expiresAtMs = (expiresRaw ? Date.parse(expiresRaw) : NaN) || Date.now() + DEFAULT_TOKEN_LIFETIME_MS;
  cachedToken = token;
  return token;
}

async function getBearerToken(forceRefresh: boolean): Promise<string> {
  if (!forceRefresh && tokenFresh() && cachedToken) {
    return cachedToken;
  }
  return mintServiceToken();
}

async function vibriumFetch(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const token = await getBearerToken(retried);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetchWithRetry(url, { ...init, headers });
  if (response.status === 401 && !retried) {
    clearTokenCache();
    return vibriumFetch(url, init, true);
  }
  return response;
}

/** Calls a customer-scoped Vibrium endpoint and unwraps the `{ success, data }` envelope. */
export async function vibriumJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiBaseUrl, customerId } = getVibriumConfig();
  const url = `${apiBaseUrl}/v1/customers/${customerId}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await vibriumFetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Vibrium ${response.status}: ${text.slice(0, 300)}`);
  }

  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  const envelope = body as { success?: boolean; data?: T; error?: string; message?: string } | null;
  if (envelope && typeof envelope === "object" && "success" in envelope) {
    if (envelope.success === false) {
      throw new Error(envelope.error || envelope.message || "Vibrium request failed");
    }
    if (envelope.data !== undefined) {
      return envelope.data;
    }
  }
  return body as T;
}
