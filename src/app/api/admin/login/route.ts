// src/app/api/admin/login/route.ts
// Single-admin cookie auth. Compares submitted password against ADMIN_PASSWORD
// with constant-time equality, then sets a signed session cookie.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  safeStringEqual,
  signSession,
} from "@/lib/auth";

// Lightweight per-process rate limit. Resets on deploy — acceptable for a
// single-user internal panel.
const ATTEMPTS = new Map<string, { count: number; firstAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ATTEMPTS.get(ip);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    ATTEMPTS.set(ip, { count: 1, firstAt: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts, try again later" },
      { status: 429 }
    );
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_PASSWORD not set" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const submitted =
    body && typeof body === "object" && "password" in body
      ? String((body as { password: unknown }).password ?? "")
      : "";

  if (!safeStringEqual(submitted, adminPassword)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Success: reset attempts and set the cookie.
  ATTEMPTS.delete(ip);
  cookies().set(SESSION_COOKIE, signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
