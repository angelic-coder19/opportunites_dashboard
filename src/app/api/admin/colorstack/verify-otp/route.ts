// POST /api/admin/colorstack/verify-otp
// Two modes:
//   { code: "123456", email?: "…" }  → verify OTP with ColorStack
//   { cookie: "name=val; …" }         → validate & store a manually pasted cookie
// Protected by the admin session middleware.

import { NextRequest, NextResponse } from "next/server";
import {
  verifyColorStackOtp,
  saveManualColorStackCookie,
} from "@/lib/scraper/colorstack";

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  if (body.cookie) {
    const result = await saveManualColorStackCookie(String(body.cookie));
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const code = String(body.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ ok: false, message: "code is required" }, { status: 400 });
  }

  const email = body.email ? String(body.email).trim() : undefined;
  const result = await verifyColorStackOtp(code, email);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
