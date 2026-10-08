import { NextResponse, type NextRequest } from "next/server";
import { getGmailConfig } from "../../../../lib/gmail/config";
import { revokeToken } from "../../../../lib/gmail/google";
import { clearSession, isSameOrigin, readSession } from "../../../../lib/gmail/routes";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const config = getGmailConfig();
  if (!config) {
    return NextResponse.json({ ok: true });
  }
  if (!isSameOrigin(request, config)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const session = readSession(request, config);
  if (session) {
    await revokeToken(session.refreshToken);
  }
  const response = NextResponse.json({ ok: true });
  clearSession(response);
  return response;
}
