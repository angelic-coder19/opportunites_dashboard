// Validates and saves a Workday session from token or cURL paste.

import { NextRequest, NextResponse } from "next/server";
import {
  setWorkdaySession,
  setWorkdayToken,
  validateWorkdaySession,
  type WorkdaySession,
} from "@/lib/scraper/workday";
import { curlToWorkdaySession } from "@/lib/workday-curl";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mode = String(body.mode ?? "token");

  if (mode === "curl") {
    const curl = String(body.curl ?? "").trim();
    if (!curl) {
      return NextResponse.json({ ok: false, message: "cURL is required." }, { status: 400 });
    }

    const { session, error } = curlToWorkdaySession(curl);
    if (error || !session.token) {
      return NextResponse.json(
        { ok: false, message: error ?? "Could not parse cURL." },
        { status: 400 }
      );
    }

    const check = await validateWorkdaySession(session as WorkdaySession);
    if (!check.valid) {
      return NextResponse.json(
        { ok: false, message: check.reason ?? "Workday rejected the cURL session." },
        { status: 400 }
      );
    }

    await setWorkdaySession(session as WorkdaySession, "curl");
    return NextResponse.json({
      ok: true,
      message: "Workday connected via cURL — server sync enabled.",
    });
  }

  const token = String(body.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, message: "Token is required." }, { status: 400 });
  }

  const check = await validateWorkdaySession(token);
  if (!check.valid) {
    return NextResponse.json(
      {
        ok: false,
        message:
          check.reason ??
          "Token rejected. Try Browser connect or paste the full searchJobs cURL instead.",
      },
      { status: 400 }
    );
  }

  await setWorkdayToken(token);
  return NextResponse.json({
    ok: true,
    message: "Workday token saved. If sync fails later, use Browser connect or cURL.",
  });
}
