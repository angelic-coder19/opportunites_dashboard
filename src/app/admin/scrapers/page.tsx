// src/app/admin/scrapers/page.tsx
// Admin scrapers management page. Server-rendered; cards are client components
// for interactive OTP/sync flows.

import { prisma } from "@/lib/prisma";
import {
  getColorStackCookie,
  getConnectedEmail,
  validateColorStackSession,
  getAllowedColorStackEmails,
  SESSION_COOKIE_NAME,
} from "@/lib/scraper/colorstack";
import { getWorkdayConnectMode, getWorkdayToken, isWorkdayConnected, validateWorkdaySession } from "@/lib/scraper/workday";
import { GenericScraperCard, ColorStackCard, WorkdayCard } from "./_components/ScraperCard";

export const dynamic = "force-dynamic";

interface SourceSummary {
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunAdded: number | null;
  totalInDb: number;
}

async function getSourceSummary(
  sourceKey: string,
  dbSource: string
): Promise<SourceSummary> {
  const source = await prisma.scrapeSource.findUnique({
    where: { sourceKey },
    include: { runs: { orderBy: { startedAt: "desc" }, take: 1 } },
  });

  const totalInDb = await prisma.opportunity.count({
    where: { source: dbSource },
  });
  const lastRun = source?.runs[0] ?? null;

  return {
    lastRunAt: lastRun?.completedAt?.toISOString() ?? null,
    lastRunStatus: lastRun?.status ?? null,
    lastRunAdded: lastRun?.opportunitiesAdded ?? null,
    totalInDb,
  };
}

export default async function ScrapersPage() {
  const [
    reufinderSummary,
    pathwaysSummary,
    colorstackSummary,
    workdaySummary,
    cookie,
    connectedEmail,
    workdayToken,
    workdayConnectMode,
  ] = await Promise.all([
    getSourceSummary("reufinder", "scrape_reufinder"),
    getSourceSummary("pathways", "scrape_pathways"),
    getSourceSummary("colorstack", "scrape_colorstack"),
    getSourceSummary("workday", "scrape_workday"),
    getColorStackCookie(),
    getConnectedEmail(),
    getWorkdayToken(),
    getWorkdayConnectMode(),
  ]);

  const [csSessionCheck, wdSessionCheck, workdayConnected] = await Promise.all([
    cookie ? validateColorStackSession(cookie) : Promise.resolve({ valid: false }),
    workdayToken ? validateWorkdaySession(workdayToken) : Promise.resolve({ valid: false }),
    isWorkdayConnected(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-widest uppercase text-black">
          Scrapers
        </h1>
        <p className="font-body mt-1 text-sm text-gray-500">
          Manage data sources and trigger manual syncs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <GenericScraperCard
          label="REUFinder.com"
          sourceKey="reufinder"
          lastRunAt={reufinderSummary.lastRunAt}
          lastRunStatus={reufinderSummary.lastRunStatus}
          lastRunAdded={reufinderSummary.lastRunAdded}
          totalInDb={reufinderSummary.totalInDb}
        />

        <GenericScraperCard
          label="Pathways to Science"
          sourceKey="pathways"
          lastRunAt={pathwaysSummary.lastRunAt}
          lastRunStatus={pathwaysSummary.lastRunStatus}
          lastRunAdded={pathwaysSummary.lastRunAdded}
          totalInDb={pathwaysSummary.totalInDb}
        />

        <div className="lg:col-span-2">
          <ColorStackCard
            connected={!!cookie}
            sessionValid={csSessionCheck.valid}
            connectedEmail={connectedEmail}
            allowedEmails={getAllowedColorStackEmails()}
            sessionCookieName={SESSION_COOKIE_NAME}
            lastRunAt={colorstackSummary.lastRunAt}
            lastRunStatus={colorstackSummary.lastRunStatus}
            lastRunAdded={colorstackSummary.lastRunAdded}
            totalInDb={colorstackSummary.totalInDb}
          />
        </div>

        <div className="lg:col-span-2">
          <WorkdayCard
            connected={workdayConnected}
            connectMode={workdayConnectMode}
            hasServerSession={!!workdayToken}
            sessionValid={wdSessionCheck.valid}
            lastRunAt={workdaySummary.lastRunAt}
            lastRunStatus={workdaySummary.lastRunStatus}
            lastRunAdded={workdaySummary.lastRunAdded}
            totalInDb={workdaySummary.totalInDb}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5">
        <h2 className="font-heading mb-3 text-[11px] uppercase tracking-widest text-gray-500">
          Automated Schedule (Vercel Cron)
        </h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400">
              <th className="font-heading pb-2 pr-8">Source</th>
              <th className="font-heading pb-2 pr-8">Frequency</th>
              <th className="font-heading pb-2">Next run</th>
            </tr>
          </thead>
          <tbody className="font-body text-xs text-gray-600">
            <tr className="border-b border-gray-50">
              <td className="py-2 pr-8">REUFinder.com</td>
              <td className="py-2 pr-8">Weekly (Mon 6 AM UTC)</td>
              <td className="py-2">Automatic</td>
            </tr>
            <tr className="border-b border-gray-50">
              <td className="py-2 pr-8">Pathways to Science</td>
              <td className="py-2 pr-8">Monthly (1st, 7 AM UTC)</td>
              <td className="py-2">Automatic</td>
            </tr>
            <tr className="border-b border-gray-50">
              <td className="py-2 pr-8">ColorStack</td>
              <td className="py-2 pr-8">Daily (2 AM UTC)</td>
              <td className="py-2">
                {cookie && csSessionCheck.valid ? (
                  "Automatic"
                ) : (
                  <span className="text-amber-600">Requires connection</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-8">Workday Talent Marketplace</td>
              <td className="py-2 pr-8">Daily (3 AM UTC)</td>
              <td className="py-2">
                {workdayConnected && (workdayConnectMode === "bridge" || wdSessionCheck.valid) ? (
                  workdayConnectMode === "bridge" ? (
                    "Browser sync (manual script)"
                  ) : (
                    "Automatic"
                  )
                ) : (
                  <span className="text-amber-600">Requires connection</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
