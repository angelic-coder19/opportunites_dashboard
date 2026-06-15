// Public bridge endpoint — receives jobs from a browser script on wd5.myworkday.com.
// Protected by a one-time code from /api/admin/workday/bridge-code.

import { NextRequest, NextResponse } from "next/server";
import {
  consumeWorkdayBridgeCode,
  importWorkdayJobs,
  markWorkdayBridgeConnected,
} from "@/lib/scraper/workday";

const CORS_ORIGIN = "https://wd5.myworkday.com";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const code = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!code) {
    return NextResponse.json(
      { ok: false, message: "Missing bridge code." },
      { status: 401, headers: corsHeaders() }
    );
  }

  const valid = await consumeWorkdayBridgeCode(code);
  if (!valid) {
    return NextResponse.json(
      { ok: false, message: "Invalid or expired bridge code. Generate a new one in Admin → Scrapers." },
      { status: 401, headers: corsHeaders() }
    );
  }

  const body = await req.json().catch(() => ({}));
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];
  if (jobs.length === 0) {
    return NextResponse.json(
      { ok: false, message: "No jobs received from Workday." },
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    const result = await importWorkdayJobs(jobs);
    await markWorkdayBridgeConnected();
    return NextResponse.json(
      {
        ok: true,
        message: `Imported ${result.added} UAPB jobs (${result.filtered} non-UAPB filtered, ${result.skipped} skipped).`,
        ...result,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
