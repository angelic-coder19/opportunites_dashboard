// POST /api/admin/workday/sync

import { NextResponse } from "next/server";
import { runWorkdayScraper } from "@/lib/scraper/workday";
import { ConcurrentRunError } from "@/lib/scraper";

export async function POST() {
  try {
    const result = await runWorkdayScraper();
    if (result.authError) {
      return NextResponse.json(
        { ok: false, authError: true, error: "Workday session expired — paste a fresh token." },
        { status: 401 }
      );
    }
    return NextResponse.json({
      ok: true,
      added: result.added,
      skipped: result.skipped,
      filtered: result.filtered,
    });
  } catch (error) {
    if (error instanceof ConcurrentRunError) {
      return NextResponse.json({ ok: false, busy: true, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
