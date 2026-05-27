// src/app/api/admin/logout/route.ts
// Clears the session cookie. Returns 200 regardless (idempotent).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
