import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/newsletter  Body: { email }
 *
 * Interim (pre-database) version: validates, rate limits per IP in memory
 * and logs. Once the database is connected it inserts into
 * newsletter_subscribers (unique email) and the limit moves to a shared store.
 */
const bodySchema = z.strictObject({
  email: z.email("Enter a valid email address").max(254).transform((e) => e.toLowerCase()),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (rateLimited(ip)) throw new AppError("RATE_LIMITED", "Too many attempts. Please try again later.");
    const { email } = bodySchema.parse(await request.json().catch(() => null));
    logger.info("newsletter.subscribed", { domain: email.split("@")[1] });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
