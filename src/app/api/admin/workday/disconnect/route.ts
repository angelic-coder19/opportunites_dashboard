// src/app/api/admin/workday/disconnect/route.ts

import { NextResponse } from "next/server";
import { clearWorkdayToken } from "@/lib/scraper/workday";

export async function POST() {
  await clearWorkdayToken();
  return NextResponse.json({ ok: true, message: "Workday token cleared." });
}
