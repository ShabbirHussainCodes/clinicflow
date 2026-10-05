/**
 * Minimal structured logger.
 *
 * Rules (see docs/ARCHITECTURE.md, "Logging"):
 *  - never log patient names, phone numbers, e-mail addresses or free-text fields;
 *  - log identifiers (appointment reference, event id) and error codes only;
 *  - errors are reduced to name/message/code, never the full object (which can embed request data).
 */

type Level = "info" | "warn" | "error";

type Context = Record<string, string | number | boolean | null | undefined>;

const SENSITIVE_KEYS = /name|phone|mobile|email|reason|notes|password|token|secret|authorization|cookie/i;

function sanitizeContext(context: Context | undefined): Context {
  if (!context) return {};
  const clean: Context = {};
  for (const [key, value] of Object.entries(context)) {
    clean[key] = SENSITIVE_KEYS.test(key) ? "[redacted]" : value;
  }
  return clean;
}

export function describeError(error: unknown): { name: string; message: string; code?: string } {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return {
      name: error.name,
      message: error.message.slice(0, 300),
      ...(typeof code === "string" ? { code } : {}),
    };
  }
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; code?: unknown };
    return {
      name: "Error",
      message: typeof record.message === "string" ? record.message.slice(0, 300) : "Unknown error",
      ...(typeof record.code === "string" ? { code: record.code } : {}),
    };
  }
  return { name: "Error", message: "Unknown error" };
}

function write(level: Level, event: string, context?: Context, error?: unknown) {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...sanitizeContext(context),
    ...(error === undefined ? {} : { error: describeError(error) }),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else process.stdout.write(`${line}\n`);
}

export const logger = {
  info: (event: string, context?: Context) => write("info", event, context),
  warn: (event: string, context?: Context, error?: unknown) => write("warn", event, context, error),
  error: (event: string, error: unknown, context?: Context) => write("error", event, context, error),
};
