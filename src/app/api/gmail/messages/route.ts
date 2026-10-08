import { NextResponse, type NextRequest } from "next/server";
import { getGmailConfig, INBOX_PAGE_SIZE } from "../../../../lib/gmail/config";
import { ensureAccessToken, fetchInboxMail, GmailAuthError, listInboxIds } from "../../../../lib/gmail/google";
import { clearSession, isSameOrigin, readSession, writeSession } from "../../../../lib/gmail/routes";

export const dynamic = "force-dynamic";

const MESSAGE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_KNOWN_IDS = 500;

/**
 * The desk polls this. It returns the current inbox ids and the full mail only for ids
 * the browser has not seen yet. Triage runs in the browser on the same code as the demo.
 */
export async function POST(request: NextRequest) {
  const config = getGmailConfig();
  if (!config) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!isSameOrigin(request, config)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const session = readSession(request, config);
  if (!session) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const knownIds = await readKnownIds(request);
  if (!knownIds) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const fresh = await ensureAccessToken(config, session);
    const accessToken = fresh.accessToken ?? "";
    const ids = await listInboxIds(accessToken);
    const unseen = ids.filter((id) => !knownIds.has(id)).slice(0, INBOX_PAGE_SIZE);
    const mails = await Promise.all(unseen.map((id) => fetchInboxMail(accessToken, id, fresh.email)));

    const response = NextResponse.json({ mailbox: fresh.email, ids, mails });
    if (fresh !== session) {
      writeSession(response, fresh, config);
    }
    return response;
  } catch (error) {
    if (error instanceof GmailAuthError) {
      const response = NextResponse.json({ error: "not_connected" }, { status: 401 });
      clearSession(response);
      return response;
    }
    return NextResponse.json({ error: "gmail_unavailable" }, { status: 502 });
  }
}

async function readKnownIds(request: NextRequest): Promise<Set<string> | null> {
  try {
    const body: unknown = await request.json();
    const list = (body as { knownIds?: unknown })?.knownIds;
    if (!Array.isArray(list) || list.length > MAX_KNOWN_IDS) {
      return null;
    }
    if (!list.every((id): id is string => typeof id === "string" && MESSAGE_ID.test(id))) {
      return null;
    }
    return new Set(list);
  } catch {
    return null;
  }
}
