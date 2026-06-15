// src/lib/scraper/colorstack.ts
// Syncs the ColorStack opportunities feed into our local database.
//
// Authentication: ColorStack uses a Remix OTP flow on app.colorstack.io.
// The session cookie (__session_member-profile_production) is stored in
// app_settings and shared across all admins — connecting once is enough
// until the cookie expires (~1 year).

import { prisma } from "@/lib/prisma";
import {
  getSource,
  startRun,
  finishRun,
  insertOpportunity,
} from "./index";
import {
  parseOpportunitiesList,
  parseOpportunityDetail,
} from "@/lib/colorstack-parser";

const LIST_URL = "https://app.colorstack.io/opportunities.data";
const DETAIL_BASE = "https://app.colorstack.io/opportunities/";
const OPPORTUNITY_BASE = "https://app.colorstack.io/opportunities/";
const DETAIL_DELAY_MS = 400;
const MAX_DETAIL_FETCHES = 40;

export const SESSION_COOKIE_NAME = "__session_member-profile_production";
const OTP_SEND_URL = "https://app.colorstack.io/login/otp/send.data";
const OTP_VERIFY_URL = "https://app.colorstack.io/login/otp/verify.data";
const HOME_DATA_URL = "https://app.colorstack.io/home.data";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const OTP_MIN_INTERVAL_MS = 60_000;
const OTP_MAX_PER_HOUR = 3;

// ─── App-setting keys ─────────────────────────────────────────────────────────

const KEY_COOKIE = "colorstack_cookie";
const KEY_OTP_COOKIES = "colorstack_otp_cookies";
const KEY_OTP_SENT_AT = "colorstack_otp_sent_at";
const KEY_CONNECTED_EMAIL = "colorstack_connected_email";

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

async function deleteSetting(key: string): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key } });
}

// ─── Allowed emails ───────────────────────────────────────────────────────────

export function getAllowedColorStackEmails(): string[] {
  const raw = process.env.COLORSTACK_ALLOWED_EMAILS ?? "adedejd60502@uapb.edu";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedColorStackEmail(email: string): boolean {
  return getAllowedColorStackEmails().includes(email.trim().toLowerCase());
}

// ─── Session cookie helpers ───────────────────────────────────────────────────

export async function getColorStackCookie(): Promise<string | null> {
  return getSetting(KEY_COOKIE);
}

export async function setColorStackCookie(
  cookie: string,
  email?: string
): Promise<void> {
  const normalized = normalizeCookieInput(cookie);
  await setSetting(KEY_COOKIE, normalized);
  if (email) {
    await setSetting(KEY_CONNECTED_EMAIL, email.trim().toLowerCase());
  }
}

export async function clearColorStackCookie(): Promise<void> {
  await deleteSetting(KEY_COOKIE);
  await deleteSetting(KEY_CONNECTED_EMAIL);
  await deleteSetting(KEY_OTP_COOKIES);
}

export async function getConnectedEmail(): Promise<string | null> {
  return getSetting(KEY_CONNECTED_EMAIL);
}

function isRemixLoginRedirect(
  status: number,
  location: string | null,
  body: string
): boolean {
  if (status === 401 || status === 403) return true;
  const loc = location ?? "";
  if ((status === 302 || status === 202) && loc.includes("/login")) return true;
  if (
    (status === 202 || status === 200) &&
    (body.includes('"redirect","/login"') ||
      body.includes('"/login"') ||
      body.includes("SingleFetchRedirect"))
  ) {
    return true;
  }
  return false;
}

/** Normalize manual paste: accept value-only, name=value, or multiple cookies. */
export function normalizeCookieInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Multiple cookies pasted (name=value; name2=value2)
  if (trimmed.includes(";")) {
    return trimmed
      .split(";")
      .map((p) => p.trim())
      .filter((p) => p.includes("="))
      .join("; ");
  }

  if (trimmed.includes("=")) {
    return trimmed;
  }

  return `${SESSION_COOKIE_NAME}=${trimmed}`;
}

function hasSessionCookie(cookieHeader: string): boolean {
  return cookieHeader
    .split(";")
    .some((p) => p.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
}

function parseSetCookieHeaders(headers: Headers): string {
  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [];
  if (raw.length === 0) {
    const single = headers.get("set-cookie");
    if (single) raw.push(single);
  }
  return raw
    .map((c) => c.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function mergeCookies(
  existing: string | null,
  incoming: string
): string {
  const map = new Map<string, string>();
  for (const part of (existing ?? "").split(";")) {
    const trimmed = part.trim();
    if (!trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  for (const part of incoming.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function colorstackHeaders(cookie: string, referer: string): HeadersInit {
  return {
    Accept: "*/*",
    Cookie: cookie,
    Referer: referer,
    Origin: "https://app.colorstack.io",
    "User-Agent": BROWSER_UA,
  };
}

async function colorstackFetch(
  url: string,
  cookie: string,
  referer = "https://app.colorstack.io/opportunities"
): Promise<Response> {
  return fetch(url, {
    headers: colorstackHeaders(cookie, referer),
    redirect: "manual",
    next: { revalidate: 0 },
  });
}

/** Ping ColorStack to confirm the stored cookie still works. */
export async function validateColorStackSession(
  cookie?: string | null
): Promise<{ valid: boolean; reason?: string }> {
  const session =
    normalizeCookieInput(cookie ?? (await getColorStackCookie()) ?? "");
  if (!session) {
    return { valid: false, reason: "No session cookie stored." };
  }
  if (!hasSessionCookie(session)) {
    return {
      valid: false,
      reason: `Cookie must include ${SESSION_COOKIE_NAME}. Paste the value from DevTools or all cookies.`,
    };
  }

  try {
    const res = await colorstackFetch(LIST_URL, session);
    const body = await res.text();
    const location = res.headers.get("location");

    if (isRemixLoginRedirect(res.status, location, body)) {
      return {
        valid: false,
        reason:
          "ColorStack rejected the cookie (redirected to login). Paste all cookies from DevTools or use OTP.",
      };
    }
    if (!res.ok && res.status !== 202) {
      return {
        valid: false,
        reason: `ColorStack returned ${res.status} when checking session.`,
      };
    }
    const items = parseOpportunitiesList(body);
    if (items.length === 0 && body.length < 500) {
      return {
        valid: false,
        reason: "Session cookie did not return opportunity data.",
      };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: String(err) };
  }
}

// ─── OTP rate limiting ────────────────────────────────────────────────────────

async function checkOtpRateLimit(): Promise<{ ok: boolean; message?: string }> {
  const sentAtRaw = await getSetting(KEY_OTP_SENT_AT);
  if (!sentAtRaw) return { ok: true };

  const sentAt = parseInt(sentAtRaw, 10);
  const elapsed = Date.now() - sentAt;
  if (elapsed < OTP_MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((OTP_MIN_INTERVAL_MS - elapsed) / 1000);
    return {
      ok: false,
      message: `Please wait ${waitSec}s before requesting another OTP.`,
    };
  }
  return { ok: true };
}

async function recordOtpSent(): Promise<void> {
  await setSetting(KEY_OTP_SENT_AT, String(Date.now()));
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runColorStackScraper(): Promise<{
  added: number;
  skipped: number;
  detailsFetched: number;
  authError: boolean;
}> {
  const rawCookie = await getColorStackCookie();
  if (!rawCookie) {
    throw new Error(
      "No ColorStack session cookie found. Connect your account via Admin → Scrapers."
    );
  }

  const cookie = normalizeCookieInput(rawCookie);
  const source = await getSource("colorstack");
  const run = await startRun(source.id);

  let totalAdded = 0;
  let totalSkipped = 0;
  let detailsFetched = 0;

  try {
    const listRes = await colorstackFetch(LIST_URL, cookie);
    const listText = await listRes.text();
    const listLocation = listRes.headers.get("location");

    if (isRemixLoginRedirect(listRes.status, listLocation, listText)) {
      await finishRun(
        run.id,
        "failed",
        { found: 0, added: 0, skipped: 0, error: "Session expired" },
        false
      );
      return { added: 0, skipped: 0, detailsFetched: 0, authError: true };
    }
    if (!listRes.ok && listRes.status !== 202) {
      throw new Error(`ColorStack list returned ${listRes.status}`);
    }

    const opportunities = parseOpportunitiesList(listText);

    if (opportunities.length === 0) {
      await finishRun(run.id, "skipped", { found: 0, added: 0, skipped: 0 }, false);
      return { added: 0, skipped: 0, detailsFetched: 0, authError: false };
    }

    const existingRows = await prisma.opportunity.findMany({
      where: {
        source: "scrape_colorstack",
        sourceId: { in: opportunities.map((o) => o.id) },
      },
      select: { sourceId: true, deadline: true },
    });
    const existingIds = new Set(existingRows.map((r) => r.sourceId));
    const missingDeadlineIds = new Set(
      existingRows.filter((r) => !r.deadline).map((r) => r.sourceId)
    );

    const newOps = opportunities.filter((o) => !existingIds.has(o.id));
    const refreshOps = opportunities.filter((o) => missingDeadlineIds.has(o.id));
    const seen = new Set<string>();
    const toEnrich = [...newOps, ...refreshOps].filter((op) => {
      if (seen.has(op.id)) return false;
      seen.add(op.id);
      return true;
    }).slice(0, MAX_DETAIL_FETCHES);

    totalSkipped += opportunities.length - newOps.length;

    for (const op of toEnrich) {
      let description: string | null = null;
      let externalLink: string | null = null;
      let deadline: string | null = null;

      try {
        const detailRes = await colorstackFetch(
          `${DETAIL_BASE}${op.id}.data`,
          cookie,
          `https://app.colorstack.io/opportunities/${op.id}`
        );
        if (detailRes.ok) {
          const detailText = await detailRes.text();
          const detail = parseOpportunityDetail(detailText);
          description = detail?.description ?? null;
          externalLink = detail?.externalLink ?? null;
          deadline = detail?.deadline ?? null;
          detailsFetched++;
        }
      } catch {
        // Non-fatal: proceed with list-level data only
      }
      await sleep(DETAIL_DELAY_MS);

      const tagNames = op.tags.map((t) => t.name).filter(Boolean).slice(0, 15);

      const result = await insertOpportunity(
        {
          title: op.title,
          institution: op.companyName,
          summary:
            description ??
            `Opportunity posted by ${op.companyName} on ColorStack.`,
          deadline,
          applicationUrl: externalLink ?? `${OPPORTUNITY_BASE}${op.id}`,
          contactEmail: null,
          citizenshipReq: null,
          levels: null,
          tags: tagNames,
        },
        "scrape_colorstack",
        op.id,
        `${OPPORTUNITY_BASE}${op.id}`
      );

      if (result === "added") totalAdded++;
      else totalSkipped++;
    }

    totalSkipped += Math.max(0, newOps.length - toEnrich.filter((o) => !existingIds.has(o.id)).length);

    await finishRun(
      run.id,
      "success",
      { found: opportunities.length, added: totalAdded, skipped: totalSkipped },
      totalAdded > 0
    );

    return {
      added: totalAdded,
      skipped: totalSkipped,
      detailsFetched,
      authError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(
      run.id,
      "failed",
      { found: 0, added: totalAdded, skipped: totalSkipped, error: message },
      false
    );
    throw error;
  }
}

// ─── OTP authentication ───────────────────────────────────────────────────────

export async function sendColorStackOtp(
  email: string
): Promise<{ ok: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  if (!isAllowedColorStackEmail(normalizedEmail)) {
    return {
      ok: false,
      message:
        "This email is not on the allowed list. Contact an administrator to add your ColorStack-registered email.",
    };
  }

  const rateCheck = await checkOtpRateLimit();
  if (!rateCheck.ok) {
    return { ok: false, message: rateCheck.message ?? "Rate limit exceeded." };
  }

  try {
    const res = await fetch(OTP_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "*/*",
        Origin: "https://app.colorstack.io",
        Referer: "https://app.colorstack.io/login/otp/send",
        "User-Agent": BROWSER_UA,
      },
      body: new URLSearchParams({ email: normalizedEmail }).toString(),
      redirect: "manual",
    });

    const interimCookies = parseSetCookieHeaders(res.headers);
    if (interimCookies) {
      await setSetting(KEY_OTP_COOKIES, interimCookies);
    }

    if (res.status === 202 || res.status === 200) {
      await recordOtpSent();
      return { ok: true, message: `OTP sent to ${normalizedEmail}. Check your inbox.` };
    }

    const body = await res.text().catch(() => "");
    if (body.includes("valid email")) {
      return { ok: false, message: "Please enter a valid email address." };
    }

    return {
      ok: false,
      message: `ColorStack returned ${res.status}. ${body.slice(0, 120)}`,
    };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export async function verifyColorStackOtp(
  code: string,
  email?: string
): Promise<{ ok: boolean; message: string }> {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return { ok: false, message: "OTP code is required." };
  }

  try {
    let cookies = (await getSetting(KEY_OTP_COOKIES)) ?? "";

    const verifyRes = await fetch(OTP_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "*/*",
        Origin: "https://app.colorstack.io",
        Referer: "https://app.colorstack.io/login/otp/verify",
        "User-Agent": BROWSER_UA,
        ...(cookies ? { Cookie: cookies } : {}),
      },
      body: new URLSearchParams({ value: trimmedCode }).toString(),
      redirect: "manual",
    });

    cookies = mergeCookies(cookies, parseSetCookieHeaders(verifyRes.headers));

    // Remix may issue the session cookie on the post-login data fetch.
    if (
      !hasSessionCookie(cookies) &&
      (verifyRes.status === 202 || verifyRes.status === 302)
    ) {
      const homeRes = await fetch(HOME_DATA_URL, {
        headers: colorstackHeaders(
          cookies,
          "https://app.colorstack.io/login/otp/verify"
        ),
        redirect: "manual",
      });
      cookies = mergeCookies(cookies, parseSetCookieHeaders(homeRes.headers));
    }

    const cookieToStore = cookies;

    if (!cookieToStore || !hasSessionCookie(cookieToStore)) {
      return {
        ok: false,
        message:
          "Verification failed — no session cookie received. Check the OTP code and try again.",
      };
    }

    const validation = await validateColorStackSession(cookieToStore);
    if (!validation.valid) {
      return {
        ok: false,
        message: validation.reason ?? "Session cookie was rejected by ColorStack.",
      };
    }

    await setColorStackCookie(cookieToStore, email);
    await deleteSetting(KEY_OTP_COOKIES);

    return { ok: true, message: "Connected to ColorStack successfully." };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

/** Save and validate a manually pasted browser cookie. */
export async function saveManualColorStackCookie(
  raw: string
): Promise<{ ok: boolean; message: string }> {
  const normalized = normalizeCookieInput(raw);
  if (!normalized.includes("=")) {
    return {
      ok: false,
      message: `Cookie must include ${SESSION_COOKIE_NAME}=…`,
    };
  }
  if (!hasSessionCookie(normalized)) {
    return {
      ok: false,
      message: `Missing ${SESSION_COOKIE_NAME}. Paste the cookie value from DevTools.`,
    };
  }

  const validation = await validateColorStackSession(normalized);
  if (!validation.valid) {
    return {
      ok: false,
      message: validation.reason ?? "Cookie was rejected by ColorStack.",
    };
  }

  await setColorStackCookie(normalized);
  return {
    ok: true,
    message: "Cookie verified and saved. You can sync now.",
  };
}
