import crypto from "node:crypto";

/**
 * Shared-secret check for inbound ElevenLabs webhook/tool calls.
 *
 * The agent is configured to send `x-shopai-webhook-secret: <ELEVENLABS_WEBHOOK_SECRET>`
 * as a custom header on every tool call. If the secret is not configured
 * (local dev before the ElevenLabs phase) the check is skipped so endpoints can
 * be exercised directly — production must set the secret.
 */
export const WEBHOOK_SECRET_HEADER = "x-shopai-webhook-secret";

export function verifyWebhookSecret(headerValue: string | null): {
  ok: boolean;
  reason?: string;
} {
  const configured = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!configured) {
    // Dev mode: no secret set yet.
    return { ok: true, reason: "no-secret-configured" };
  }
  if (!headerValue) return { ok: false, reason: "missing-secret-header" };

  const a = Buffer.from(headerValue);
  const b = Buffer.from(configured);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "secret-mismatch" };
  }
  return { ok: true };
}

/**
 * Verify an ElevenLabs webhook HMAC signature (post-call and
 * conversation-initiation webhooks). Header format is `t=<unix>,v0=<hex>` signed
 * over `${t}.${rawBody}` with the workspace webhook secret. Accepts when no
 * secret is configured so the endpoint stays testable in dev.
 */
export function verifyElevenLabsSignature(
  rawBody: string,
  signatureHeader: string | null,
): { ok: boolean; reason?: string } {
  const secret =
    process.env.ELEVENLABS_POST_CALL_SECRET ?? process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) return { ok: true, reason: "no-secret-configured" };
  if (!signatureHeader) return { ok: false, reason: "missing-signature" };

  const segments = signatureHeader.split(",");
  const t = segments.find((s) => s.startsWith("t="))?.slice(2);
  const v0 = segments.find((s) => s.startsWith("v0="));
  if (!t || !v0) return { ok: false, reason: "malformed-signature" };

  const expected =
    "v0=" +
    crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(v0);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature-mismatch" };
  }
  return { ok: true };
}
