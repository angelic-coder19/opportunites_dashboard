// src/app/api/scrape/workday/route.ts
// CRON endpoint — protected by CRON_SECRET. Triggered by Vercel's cron scheduler.

import { NextRequest, NextResponse } from "next/server";
import { runWorkdayScraper } from "@/lib/scraper/workday";

export const maxDuration = 300; // 5-min Vercel function timeout

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await runWorkdayScraper();
    if (result.authError) {
      return NextResponse.json(
        { ok: false, authError: true, error: "Workday session expired." },
        { status: 401 }
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/workday]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
