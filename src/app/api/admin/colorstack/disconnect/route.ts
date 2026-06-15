// POST /api/admin/colorstack/disconnect
// Clears the stored ColorStack session cookie.
// Protected by the admin session middleware.

import { NextResponse } from "next/server";
import { clearColorStackCookie } from "@/lib/scraper/colorstack";

export async function POST() {
  await clearColorStackCookie();
  return NextResponse.json({ ok: true });
}
