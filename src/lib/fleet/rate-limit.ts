const hits = new Map<string, { count: number; resetAt: number }>();

/** Per-IP counter held in memory. Enough to stop a loop from burning the agent budget. Returns true when over the limit. */
export function overRateLimit(request: Request, bucket: string, limit: number, windowMs: number): boolean {
  const ip =
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();

  if (hits.size > 1_000) {
    for (const [stored, entry] of hits) {
      if (now > entry.resetAt) {
        hits.delete(stored);
      }
    }
  }

  const current = hits.get(key);
  if (!current || now > current.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}
