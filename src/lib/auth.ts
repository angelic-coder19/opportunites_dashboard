// src/lib/auth.ts
// Node-runtime auth helpers for API routes. Middleware uses the Web Crypto
// variant in auth-edge.ts because node:crypto is not available on Edge.
// Wire format is shared between the two so cookies issued here verify there.

import crypto from "node:crypto";

export const SESSION_COOKIE = "uapb_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24h in seconds

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is not set");
    }
    return "dev-insecure-secret-do-not-use-in-prod";
  }
  return secret;
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/**
 * Returns a signed session token of the form `<payload>.<sig>` where payload
 * is base64url("<issuedAtSeconds>.<nonce>"). Verify with verifySession.
 */
export function signSession(): string {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = base64url(crypto.randomBytes(12));
  const payload = base64url(Buffer.from(`${ts}.${nonce}`, "utf8"));
  const sig = base64url(
    crypto.createHmac("sha256", getSecret()).update(payload).digest()
  );
  return `${payload}.${sig}`;
}

export function verifySession(value: string | undefined | null): {
  valid: boolean;
  expired: boolean;
} {
  if (!value) return { valid: false, expired: false };
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return { valid: false, expired: false };

  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest();
  const providedSig = fromBase64url(sig);
  if (
    providedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(providedSig, expectedSig)
  ) {
    return { valid: false, expired: false };
  }

  const decoded = fromBase64url(payload).toString("utf8");
  const [tsStr] = decoded.split(".");
  const ts = parseInt(tsStr, 10);
  if (!Number.isFinite(ts)) return { valid: false, expired: false };

  const now = Math.floor(Date.now() / 1000);
  if (now - ts > SESSION_MAX_AGE) return { valid: false, expired: true };

  return { valid: true, expired: false };
}

/** Constant-time string compare. Returns false if lengths differ. */
export function safeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
