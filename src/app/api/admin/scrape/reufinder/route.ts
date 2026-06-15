// POST /api/admin/scrape/reufinder
// Manual sync from admin panel (session-protected).

import { NextResponse } from "next/server";
import { runReufinderScraper } from "@/lib/scraper/reufinder";
import { ConcurrentRunError } from "@/lib/scraper";

export async function POST() {
  try {
    const result = await runReufinderScraper();
    return NextResponse.json({ ok: true, source: "reufinder", ...result });
  } catch (error) {
    if (error instanceof ConcurrentRunError) {
      return NextResponse.json({ ok: false, busy: true, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
