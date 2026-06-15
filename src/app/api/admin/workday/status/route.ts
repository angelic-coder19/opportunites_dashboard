// src/app/api/admin/workday/status/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkdayToken, validateWorkdaySession } from "@/lib/scraper/workday";

export async function GET() {
  const token = await getWorkdayToken();
  const hasToken = !!token;

  let sessionValid = false;
  if (hasToken) {
    const check = await validateWorkdaySession(token);
    sessionValid = check.valid;
  }

  const source = await prisma.scrapeSource.findUnique({
    where: { sourceKey: "workday" },
    include: { runs: { orderBy: { startedAt: "desc" }, take: 1 } },
  });

  const totalInDb = await prisma.opportunity.count({ where: { source: "scrape_workday" } });
  const lastRun = source?.runs[0] ?? null;

  return NextResponse.json({
    ok: true,
    hasToken,
    sessionValid,
    totalInDb,
    lastRunAt: lastRun?.completedAt?.toISOString() ?? null,
    lastRunStatus: lastRun?.status ?? null,
    lastRunAdded: lastRun?.opportunitiesAdded ?? null,
  });
}
