import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated lazily so `next build` never needs secrets and a
 * misconfiguration produces one clear message instead of an obscure runtime failure.
 *
 * None of these values are exposed to the browser: the browser never talks to Supabase
 * directly. All data access happens in Server Components, Server Actions and Route Handlers.
 */

const optionalString = (schema: z.ZodString) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url({ protocol: /^https?$/ }).optional(),
);

const envSchema = z.object({
  SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: optionalString(z.string().min(20)),
  SITE_URL: optionalUrl,
  CRON_SECRET: optionalString(z.string().min(16)),
  N8N_WEBHOOK_URL: optionalUrl,
  N8N_WEBHOOK_SECRET: optionalString(z.string().min(16)),
  N8N_WEBHOOK_AUTH_TOKEN: optionalString(z.string().min(16)),
  EVENT_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
  EVENT_REMINDER_LEAD_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  BOOKING_RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(10000).default(8),
  /** Failed-or-successful sign-in attempts allowed per e-mail address per 15 minutes. */
  LOGIN_ATTEMPTS_PER_15_MIN: z.coerce.number().int().min(1).max(10000).default(6),
  /** Shows the "demonstration site" strip. Set to "false" for a real clinic deployment. */
  SHOW_DEMO_NOTICE: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
  ),
});

export type AppEnv = z.infer<typeof envSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new ConfigError(
      `Invalid or missing environment variables (${problems}). Copy .env.example to .env.local and fill it in.`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: forget the memoised value after changing process.env. */
export function resetEnvCache(): void {
  cached = undefined;
}

export function getSiteUrl(): string {
  return getEnv().SITE_URL ?? "http://localhost:3000";
}

export function isDispatcherConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.SUPABASE_SERVICE_ROLE_KEY && env.CRON_SECRET && env.N8N_WEBHOOK_URL);
}
