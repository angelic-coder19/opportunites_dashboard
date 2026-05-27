// One-off helper for the REUFinder URL-extraction fix.
// Usage: $env:DATABASE_URL="..."; npx tsx scripts/backfill-reufinder.ts
// - Deletes existing scrape_reufinder rows (use --keep to skip delete).
// - Resets source.lastChangedAt so the scraper reprocesses all recent posts.
// - Invokes runReufinderScraper.

import "dotenv/config"; // load GOOGLE_AI_API_KEY from .env when running via tsx
import { prisma } from "../src/lib/prisma";
import { runReufinderScraper } from "../src/lib/scraper/reufinder";

async function main() {
  const args = process.argv.slice(2);
  const keep = args.includes("--keep");

  if (!keep) {
    const deleted = await prisma.opportunity.deleteMany({
      where: { source: "scrape_reufinder" },
    });
    console.log(`[backfill] Deleted ${deleted.count} existing scrape_reufinder rows`);
  } else {
    console.log("[backfill] --keep set, preserving existing rows");
  }

  // Reset lastChangedAt + contentHash so the scraper reprocesses all recent posts.
  const reset = await prisma.scrapeSource.update({
    where: { sourceKey: "reufinder" },
    data: { contentHash: null, lastChangedAt: null },
  });
  console.log(`[backfill] Reset content hash + lastChangedAt on source ${reset.id}`);

  console.log("[backfill] Running reufinder scraper");
  const start = Date.now();
  const result = await runReufinderScraper();
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[backfill] Done in ${secs}s`, result);

  const sample = await prisma.opportunity.findMany({
    where: { source: "scrape_reufinder" },
    select: {
      title: true,
      institution: true,
      applicationUrl: true,
      deadline: true,
      tags: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.opportunity.count({
    where: { source: "scrape_reufinder" },
  });
  const nullUrl = await prisma.opportunity.count({
    where: { source: "scrape_reufinder", applicationUrl: null },
  });

  console.log(`\n[backfill] reufinder total: ${total}, NULL applicationUrl: ${nullUrl}`);
  console.log("\n[backfill] Sample inserted rows:");
  console.log(JSON.stringify(sample, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
