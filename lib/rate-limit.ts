import { AppError } from "@/lib/errors";

/**
 * Sliding-window rate limiter kept in memory.
 *
 * Good enough for one server (development, a single instance). On Vercel each
 * serverless instance has its own memory, so for production limits move this
 * to a shared store (Upstash Redis or a Postgres table) behind the same API.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) buckets.clear();
  if (recent.length > max) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a moment and try again.");
  }
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
