// POST /api/admin/colorstack/send-otp
// Triggers ColorStack to send an OTP. Requires admin session + allowed email.

import { NextRequest, NextResponse } from "next/server";
import { sendColorStackOtp } from "@/lib/scraper/colorstack";

export async function POST(req: NextRequest) {
  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — will fail validation below
  }

  const email = String(body.email ?? "").trim();
  if (!email) {
    return NextResponse.json(
      { ok: false, message: "email is required" },
      { status: 400 }
    );
  }

  const result = await sendColorStackOtp(email);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
