// src/lib/auth-edge.ts
// Web Crypto variant of verifySession for middleware, which runs on Edge.
// MUST produce byte-identical HMAC output to src/lib/auth.ts.

export const SESSION_COOKIE = "uapb_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24;

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

function fromBase64url(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out.buffer;
}

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

export async function verifySessionEdge(
  value: string | undefined | null
): Promise<{ valid: boolean; expired: boolean }> {
  if (!value) return { valid: false, expired: false };
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return { valid: false, expired: false };

  const enc = new TextEncoder();
  const key = await getKey();
  const sigBytes = fromBase64url(sig);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    enc.encode(payload)
  );
  if (!ok) return { valid: false, expired: false };

  const payloadBytes = new Uint8Array(fromBase64url(payload));
  const decoded = new TextDecoder().decode(payloadBytes);
  const [tsStr] = decoded.split(".");
  const ts = parseInt(tsStr, 10);
  if (!Number.isFinite(ts)) return { valid: false, expired: false };

  const now = Math.floor(Date.now() / 1000);
  if (now - ts > SESSION_MAX_AGE) return { valid: false, expired: true };

  return { valid: true, expired: false };
}
