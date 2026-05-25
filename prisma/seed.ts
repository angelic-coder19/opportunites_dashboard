// prisma/seed.ts
// Run with: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import opportunitiesData from "../src/data/opportunities.json";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding opportunities...");

  for (const opp of opportunitiesData) {
    await prisma.opportunity.upsert({
      where: {
        // Manual entries don't have a sourceId, so upsert by id instead.
        // The @@unique([source, sourceId]) constraint handles scraped dedup.
        id: opp.id,
      },
      update: {
        // If re-seeding, keep the record but refresh mutable fields.
        title: opp.title,
        institution: opp.institution,
        summary: opp.summary,
        tags: opp.tags ?? [],
      },
      create: {
        id: opp.id,
        title: opp.title,
        institution: opp.institution,
        summary: opp.summary,
        category: opp.category,
        deadline: opp.deadline ? new Date(opp.deadline) : null,
        datePosted: new Date(opp.datePosted),
        applicationUrl: opp.applicationUrl ?? null,
        contactEmail: opp.contactEmail ?? null,
        contactPhone: opp.contactPhone ?? null,
        tags: opp.tags ?? [],
        source: "manual",
        status: "active",
      },
    });
    console.log(`  ✓ ${opp.institution} — ${opp.title.slice(0, 50)}`);
  }

  console.log("\n🌱 Seeding scrape sources...");

  await prisma.scrapeSource.upsert({
    where: { sourceKey: "reufinder" },
    update: {},
    create: {
      label: "REUFinder.com",
      sourceKey: "reufinder",
      url: "https://reufinder.com/wp-json/wp/v2/posts?per_page=10&_fields=id,date,modified,slug,link,content&orderby=date&order=desc",
      parserType: "cheerio",
      checkFrequency: "weekly",
      notes:
        "WordPress REST API — returns recent posts as JSON. Content is HTML; parsed with cheerio then sent to Claude for extraction.",
    },
  });
  console.log("  ✓ REUFinder.com");

  await prisma.scrapeSource.upsert({
    where: { sourceKey: "pathways" },
    update: {},
    create: {
      label: "Pathways to Science",
      sourceKey: "pathways",
      url: "https://pathwaystoscience.org/programs.aspx?dd=SummerResearch_Summer+Research+Opportunity&submit=y&dhub=SummerResearch_Summer+Research+Opportunity&all=all",
      parserType: "cheerio",
      checkFrequency: "monthly",
      notes:
        "Single-page listing of 624+ summer research programs. Hash-gated — only parses when content changes.",
    },
  });
  console.log("  ✓ Pathways to Science");

  console.log("\n✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());