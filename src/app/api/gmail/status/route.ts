import { NextResponse, type NextRequest } from "next/server";
import { getGmailConfig } from "../../../../lib/gmail/config";
import { readSession } from "../../../../lib/gmail/routes";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const config = getGmailConfig();
  if (!config) {
    return NextResponse.json({ configured: false, connected: false, email: null });
  }
  const session = readSession(request, config);
  return NextResponse.json({ configured: true, connected: session !== null, email: session?.email ?? null });
}
