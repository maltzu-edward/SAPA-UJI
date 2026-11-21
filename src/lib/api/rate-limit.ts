import { ApiError } from "@/lib/api/http";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastCleanupAt = 0;

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 1_000 && now - lastCleanupAt > 60_000) {
    lastCleanupAt = now;
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) throw new ApiError(429, "Too many requests. Try again later.", "RATE_LIMITED");
}

export function requestAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
