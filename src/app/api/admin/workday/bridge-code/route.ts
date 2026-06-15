// Generates a one-time code + browser script for Workday bridge import.

import { NextRequest, NextResponse } from "next/server";
import { createWorkdayBridgeCode } from "@/lib/scraper/workday";
import { buildWorkdayBridgeScript } from "@/lib/workday-bridge-script";

export async function GET(req: NextRequest) {
  const { code, expiresAt } = await createWorkdayBridgeCode();
  const bridgeUrl = new URL("/api/workday/bridge", req.nextUrl.origin).toString();
  const script = buildWorkdayBridgeScript(bridgeUrl, code);

  return NextResponse.json({
    ok: true,
    code,
    expiresAt,
    bridgeUrl,
    script,
  });
}
