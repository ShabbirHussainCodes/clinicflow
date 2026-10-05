import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ConfigError, getEnv, isDispatcherConfigured, resetEnvCache } from "@/lib/env";

const KEYS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SITE_URL",
  "CRON_SECRET",
  "N8N_WEBHOOK_URL",
  "N8N_WEBHOOK_SECRET",
  "BOOKING_RATE_LIMIT_PER_HOUR",
  "SHOW_DEMO_NOTICE",
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  resetEnvCache();
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  resetEnvCache();
});

describe("getEnv", () => {
  it("explains what is missing in one message", () => {
    expect(() => getEnv()).toThrow(ConfigError);
    expect(() => getEnv()).toThrow(/SUPABASE_URL/);
    expect(() => getEnv()).toThrow(/\.env\.example/);
  });

  it("applies defaults and treats empty optional values as unset", () => {
    process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_ANON_KEY = "a".repeat(30);
    process.env.N8N_WEBHOOK_URL = "";
    process.env.CRON_SECRET = "";
    const env = getEnv();
    expect(env.N8N_WEBHOOK_URL).toBeUndefined();
    expect(env.BOOKING_RATE_LIMIT_PER_HOUR).toBe(8);
    expect(env.SHOW_DEMO_NOTICE).toBe(true);
    expect(isDispatcherConfigured()).toBe(false);
  });

  it("enables the dispatcher only when every required variable is present", () => {
    process.env.SUPABASE_URL = "https://abc.supabase.co";
    process.env.SUPABASE_ANON_KEY = "a".repeat(30);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "s".repeat(30);
    process.env.CRON_SECRET = "c".repeat(20);
    expect(isDispatcherConfigured()).toBe(false);
    resetEnvCache();
    process.env.N8N_WEBHOOK_URL = "https://n8n.example.com/webhook/x";
    expect(isDispatcherConfigured()).toBe(true);
  });

  it("rejects non-http URLs and short secrets", () => {
    process.env.SUPABASE_URL = "ftp://nope";
    process.env.SUPABASE_ANON_KEY = "a".repeat(30);
    expect(() => getEnv()).toThrow(ConfigError);
    resetEnvCache();
    process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.CRON_SECRET = "short";
    expect(() => getEnv()).toThrow(ConfigError);
  });

  it("parses the demo notice flag", () => {
    process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_ANON_KEY = "a".repeat(30);
    process.env.SHOW_DEMO_NOTICE = "false";
    expect(getEnv().SHOW_DEMO_NOTICE).toBe(false);
  });
});
