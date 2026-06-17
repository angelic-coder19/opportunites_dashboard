// POST /api/cron/purge-expired
// Daily cleanup: removes expired and placeholder opportunities.

import { NextRequest, NextResponse } from "next/server";
import {
  purgeExpiredOpportunities,
  purgeInvalidOpportunities,
} from "@/lib/purge-opportunities";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [invalid, expired] = await Promise.all([
    purgeInvalidOpportunities(),
    purgeExpiredOpportunities(),
  ]);

  return NextResponse.json({
    ok: true,
    deletedInvalid: invalid,
    deletedExpired: expired,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
