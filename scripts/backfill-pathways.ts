// One-off helper for the Pathways rewrite.
// Usage: $env:DATABASE_URL="..."; npx tsx scripts/backfill-pathways.ts [cap]
// - Deletes existing scrape_pathways rows on first run (use --keep to skip delete).
// - Resets the source content_hash so the new scraper doesn't short-circuit.
// - Invokes runPathwaysScraper with the requested enrichCap (default 5 for safety).
//
// Run with a small cap first (e.g. 5), inspect the results, then re-run with
// a higher cap (e.g. 999) for the full backfill.

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { runPathwaysScraper } from "../src/lib/scraper/pathways";

async function main() {
  const args = process.argv.slice(2);
  const keep = args.includes("--keep");
  const capArg = args.find((a) => !a.startsWith("--"));
  const cap = capArg ? parseInt(capArg, 10) : 5;

  if (!keep) {
    const deleted = await prisma.opportunity.deleteMany({
      where: { source: "scrape_pathways" },
    });
    console.log(`[backfill] Deleted ${deleted.count} existing scrape_pathways rows`);
  } else {
    console.log("[backfill] --keep set, preserving existing rows");
  }

  // Reset content hash so the scraper doesn't short-circuit on "no change".
  const reset = await prisma.scrapeSource.update({
    where: { sourceKey: "pathways" },
    data: { contentHash: null },
  });
  console.log(`[backfill] Reset content hash on source ${reset.id}`);

  console.log(`[backfill] Running pathways scraper with enrichCap=${cap}`);
  const start = Date.now();
  const result = await runPathwaysScraper({ enrichCap: cap });
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[backfill] Done in ${secs}s`, result);

  const sample = await prisma.opportunity.findMany({
    where: { source: "scrape_pathways" },
    select: {
      title: true,
      institution: true,
      applicationUrl: true,
      deadline: true,
      tags: true,
    },
    take: 3,
    orderBy: { createdAt: "desc" },
  });
  console.log("\n[backfill] Sample inserted rows:");
  console.log(JSON.stringify(sample, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
