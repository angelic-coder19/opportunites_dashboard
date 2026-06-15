// POST /api/admin/colorstack/sync
// Manual sync from the admin panel. Uses admin session auth (not CRON_SECRET).

import { NextResponse } from "next/server";
import { runColorStackScraper } from "@/lib/scraper/colorstack";
import { ConcurrentRunError } from "@/lib/scraper";

export async function POST() {
  try {
    const result = await runColorStackScraper();

    if (result.authError) {
      return NextResponse.json(
        {
          ok: false,
          authError: true,
          error: "ColorStack session expired. Reconnect via OTP or paste a fresh cookie.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, source: "colorstack", ...result });
  } catch (error) {
    if (error instanceof ConcurrentRunError) {
      return NextResponse.json({ ok: false, busy: true, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
