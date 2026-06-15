// GET /api/admin/colorstack/status
// Returns connection status + last scrape run summary.
// Protected by the admin session middleware.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getColorStackCookie,
  getConnectedEmail,
  validateColorStackSession,
  SESSION_COOKIE_NAME,
} from "@/lib/scraper/colorstack";

export async function GET() {
  const cookie = await getColorStackCookie();
  const connectedEmail = await getConnectedEmail();

  let sessionValid = false;
  if (cookie) {
    const check = await validateColorStackSession(cookie);
    sessionValid = check.valid;
  }

  const source = await prisma.scrapeSource.findUnique({
    where: { sourceKey: "colorstack" },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  const lastRun = source?.runs[0] ?? null;
  const count = await prisma.opportunity.count({
    where: { source: "scrape_colorstack" },
  });

  return NextResponse.json({
    connected: !!cookie && sessionValid,
    hasCookie: !!cookie,
    sessionValid,
    sessionCookieName: SESSION_COOKIE_NAME,
    connectedEmail,
    allowedEmails: process.env.COLORSTACK_ALLOWED_EMAILS
      ? process.env.COLORSTACK_ALLOWED_EMAILS.split(",").map((e) => e.trim())
      : ["adedejd60502@uapb.edu"],
    lastRunAt: lastRun?.completedAt ?? null,
    lastRunStatus: lastRun?.status ?? null,
    lastRunAdded: lastRun?.opportunitiesAdded ?? null,
    lastRunFound: lastRun?.opportunitiesFound ?? null,
    totalInDb: count,
  });
}
