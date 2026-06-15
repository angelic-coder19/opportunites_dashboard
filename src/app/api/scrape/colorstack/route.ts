// POST /api/scrape/colorstack
// Called by Vercel Cron daily, or manually from the admin scrapers panel.
// Protected by CRON_SECRET (not the admin session) so Vercel can call it.

import { NextRequest, NextResponse } from "next/server";
import { runColorStackScraper } from "@/lib/scraper/colorstack";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[scraper] ColorStack run started");
    const result = await runColorStackScraper();
    console.log("[scraper] ColorStack run complete", result);

    if (result.authError) {
      return NextResponse.json(
        { ok: false, error: "Session expired. Re-authenticate via Admin → Scrapers." },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, source: "colorstack", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[scraper] ColorStack run failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
