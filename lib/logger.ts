import "server-only";

/**
 * Structured JSON logs (one line per event) for Vercel's log drain.
 * Never pass secrets, signatures, tokens or card data. Keys that look
 * sensitive are redacted anyway as a safety net.
 */

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const SENSITIVE_KEY = /secret|password|token|signature|authorization|cookie|card|cvv|vpa|key$/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function write(level: Level, event: string, fields: Fields = {}) {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...(redact(fields) as Fields),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: Fields) => {
    if (process.env.NODE_ENV !== "production") write("debug", event, fields);
  },
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields & { err?: unknown }) => {
    const { err, ...rest } = fields ?? {};
    write("error", event, {
      ...rest,
      ...(err instanceof Error ? { errName: err.name, errMessage: err.message } : {}),
    });
  },
};
