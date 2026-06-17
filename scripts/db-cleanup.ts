// scripts/db-cleanup.ts
// One-time / periodic database cleanup for production.
//
// Usage:
//   npx tsx scripts/db-cleanup.ts
//
// Requires DATABASE_URL in the environment (.env).

import { prisma } from "../src/lib/prisma";
import { runOpportunityMaintenance } from "../src/lib/purge-opportunities";

async function printStats(label: string) {
  const counts = await prisma.opportunity.groupBy({
    by: ["source"],
    _count: { _all: true },
  });
  const missingDeadlines = await prisma.opportunity.count({
    where: { deadline: null, source: { startsWith: "scrape_" } },
  });
  const total = await prisma.opportunity.count();

  console.log(`\n${label}`);
  console.log(`  Total opportunities: ${total}`);
  console.log(`  Scraped rows missing deadlines: ${missingDeadlines}`);
  console.log("  By source:");
  for (const row of counts) {
    console.log(`    ${row.source}: ${row._count._all}`);
  }
}

async function main() {
  console.log("Running opportunity database cleanup…");
  await printStats("Before cleanup");

  const result = await runOpportunityMaintenance();
  console.log("\nCleanup results:");
  console.log(`  Invalid/placeholder rows removed: ${result.deletedInvalid}`);
  console.log(`  Expired rows removed: ${result.deletedExpired}`);

  await printStats("After cleanup");
  console.log("\nNext steps for the repo owner:");
  console.log("  1. Admin → Scrapers → Sync ColorStack, Pathways, REUFinder, and Workday");
  console.log("  2. Or trigger cron/API routes if configured on Vercel");
  console.log("  3. Re-run this script after sync to verify counts");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
