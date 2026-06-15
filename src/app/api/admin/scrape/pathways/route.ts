// POST /api/admin/scrape/pathways
// Manual sync from admin panel (session-protected).

import { NextResponse } from "next/server";
import { runPathwaysScraper } from "@/lib/scraper/pathways";
import { ConcurrentRunError } from "@/lib/scraper";

export async function POST() {
  try {
    const result = await runPathwaysScraper();
    return NextResponse.json({ ok: true, source: "pathways", ...result });
  } catch (error) {
    if (error instanceof ConcurrentRunError) {
      return NextResponse.json({ ok: false, busy: true, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
