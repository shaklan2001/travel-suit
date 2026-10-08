import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** What the browser holds, encrypted in an httpOnly cookie. There is no database in this suite. */
export interface GmailSession {
  refreshToken: string;
  email: string;
  accessToken?: string;
  accessTokenExpiresAt?: number;
}

const IV_BYTES = 12;
const TAG_BYTES = 16;

function keyFrom(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function sealSession(session: GmailSession, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const sealed = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), sealed]).toString("base64url");
}

/** Returns null for a missing, tampered, or malformed cookie. */
export function openSession(value: string | undefined, secret: string): GmailSession | null {
  if (!value) {
    return null;
  }
  try {
    const raw = Buffer.from(value, "base64url");
    if (raw.length <= IV_BYTES + TAG_BYTES) {
      return null;
    }
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), raw.subarray(0, IV_BYTES));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const plain = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
    const parsed: unknown = JSON.parse(plain);
    return isGmailSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isGmailSession(value: unknown): value is GmailSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.refreshToken === "string" && typeof candidate.email === "string";
}
