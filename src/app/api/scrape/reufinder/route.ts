// src/app/api/scrape/reufinder/route.ts
// Called by Vercel Cron weekly, or manually from the admin scraper panel.
// Protected by CRON_SECRET so only Vercel or authorised callers can trigger it.

import { NextRequest, NextResponse } from "next/server";
import { runReufinderScraper } from "@/lib/scraper/reufinder";

export async function POST(req: NextRequest) {
  // Verify the request is from Vercel Cron or an authorised admin call.
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[scraper] REUFinder run started");
    const result = await runReufinderScraper();
    console.log("[scraper] REUFinder run complete", result);

    return NextResponse.json({
      ok: true,
      source: "reufinder",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[scraper] REUFinder run failed:", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

// Allow Vercel Cron to call this route without a request body
export async function GET(req: NextRequest) {
  return POST(req);
}