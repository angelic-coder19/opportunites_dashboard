// src/app/api/scrape/pathways/route.ts

import { NextRequest, NextResponse } from "next/server";
import { runPathwaysScraper } from "@/lib/scraper/pathways";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Optional ?cap=N raises the per-run enrichment cap above the cron default.
    // Used for one-off backfills. Capped at 1000 to prevent runaway runs.
    const capParam = req.nextUrl.searchParams.get("cap");
    const enrichCap = capParam ? Math.min(parseInt(capParam, 10) || 0, 1000) : undefined;

    console.log(`[scraper] PathwaysToScience run started (enrichCap=${enrichCap ?? "default"})`);
    const result = await runPathwaysScraper({ enrichCap });
    console.log("[scraper] PathwaysToScience run complete", result);

    return NextResponse.json({
      ok: true,
      source: "pathways",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[scraper] PathwaysToScience run failed:", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}