import crypto from "node:crypto";

/**
 * Conversation session token (spec §21).
 *
 * Binds a conversation to a customer identity in a way the model/user cannot
 * forge. Minted server-side for an authenticated browser session (or, later, a
 * verified phone caller) and passed to the ElevenLabs agent as a dynamic
 * variable. Every server tool re-derives identity by verifying this token and
 * ignores any customer id the model supplies.
 */

export interface SessionTokenPayload {
  customerId: string;
  /** For phone: whether a second factor has been confirmed (spec §21). */
  verified: boolean;
  /** Expiry, epoch seconds. */
  exp: number;
}

const DEFAULT_TTL_SECONDS = 60 * 30; // 30 minutes

function secret(): string {
  const s = process.env.SESSION_TOKEN_SECRET;
  if (!s) throw new Error("SESSION_TOKEN_SECRET is not set");
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function signSessionToken(opts: {
  customerId: string;
  verified?: boolean;
  ttlSeconds?: number;
}): string {
  const payload: SessionTokenPayload = {
    customerId: opts.customerId,
    verified: opts.verified ?? true,
    exp: Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
    return null;
  }
  if (!payload.customerId) return null;
  return payload;
}
