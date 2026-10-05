import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook signing.
 *
 * The signature covers the timestamp AND the raw body (`${timestamp}.${body}`) so a captured
 * request cannot be replayed later or with a modified payload. The receiver recomputes the HMAC
 * with the shared secret, compares in constant time and rejects timestamps that are too old.
 * docs/N8N_INTEGRATION.md contains a ready-to-paste verification snippet for an n8n Code node.
 */

export const SIGNATURE_VERSION = "v1";

export function signPayload(secret: string, timestamp: string, body: string): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `${SIGNATURE_VERSION}=${digest}`;
}

export function verifySignature(
  secret: string,
  timestamp: string,
  body: string,
  signature: string,
  options: { toleranceSeconds?: number; now?: number } = {},
): boolean {
  const { toleranceSeconds = 300, now = Date.now() } = options;
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(now / 1000 - sentAt) > toleranceSeconds) return false;

  const expected = Buffer.from(signPayload(secret, timestamp, body));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
