// POST /api/cron/purge-expired
// Daily cleanup: removes expired and placeholder opportunities.

import { NextRequest, NextResponse } from "next/server";
import {
  purgeExpiredOpportunities,
  purgePlaceholderOpportunities,
} from "@/lib/purge-opportunities";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [placeholders, expired] = await Promise.all([
    purgePlaceholderOpportunities(),
    purgeExpiredOpportunities(),
  ]);

  return NextResponse.json({
    ok: true,
    deletedPlaceholders: placeholders,
    deletedExpired: expired,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
