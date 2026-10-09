import { z } from "zod";

/**
 * One error shape for every endpoint and server action:
 *   { error: { code, message } }
 * Messages are safe to show to the customer. Internal details (SQL errors,
 * stack traces) are logged server-side and never returned.
 */

export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  OUT_OF_STOCK: 409,
  PRICE_CHANGED: 409,
  INVALID_STATE: 409,
  COUPON_INVALID: 422,
  NOT_SERVICEABLE: 422,
  PAYMENT_FAILED: 402,
  SIGNATURE_INVALID: 400,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export type ErrorBody = { error: { code: ErrorCode; message: string } };

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
  }

  toBody(): ErrorBody {
    return { error: { code: this.code, message: this.message } };
  }
}

/** Shape returned by server actions: data or a safe error, never a throw. */
export type ActionResult<T> = { data: T; error?: never } | { data?: never; error: ErrorBody["error"] };

/** Minimal shape of a PostgREST / supabase-js error. */
type PostgrestLikeError = { code?: string; message?: string; hint?: string | null };

/**
 * Convert anything thrown or returned by Supabase into an AppError.
 * Business errors raised in SQL use errcode P0001 with a hint naming our code,
 * e.g. `raise exception 'Only 2 left of Oslo Sofa' using hint = 'OUT_OF_STOCK'`.
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return new AppError("VALIDATION_ERROR", `${where}${first?.message ?? "Invalid input"}`);
  }

  if (err && typeof err === "object" && "code" in err) {
    const pg = err as PostgrestLikeError;
    if (pg.code === "P0001" && pg.hint && pg.hint in ERROR_STATUS) {
      return new AppError(pg.hint as ErrorCode, pg.message ?? "Request could not be completed");
    }
    switch (pg.code) {
      case "23505":
        return new AppError("CONFLICT", "This already exists");
      case "23503":
        return new AppError("NOT_FOUND", "A referenced item does not exist");
      case "23514":
      case "22P02":
        return new AppError("VALIDATION_ERROR", "Invalid input");
      case "42501":
        return new AppError("FORBIDDEN", "You are not allowed to do this");
      case "PGRST116":
        return new AppError("NOT_FOUND", "Not found");
      case "P0001":
        // Raised by our own SQL without a known hint: message is written for customers.
        return new AppError("INVALID_STATE", pg.message ?? "Request could not be completed");
    }
  }

  return new AppError("INTERNAL_ERROR", "Something went wrong. Please try again.");
}

/** JSON response for Route Handlers. */
export function errorResponse(err: unknown): Response {
  const appError = toAppError(err);
  return Response.json(appError.toBody(), { status: appError.status });
}

export function actionError(err: unknown): { error: ErrorBody["error"] } {
  return toAppError(err).toBody();
}
