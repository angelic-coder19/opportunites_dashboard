// prisma/seed.ts
// Run with: npx prisma db seed

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding scrape sources...");

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
        "WordPress REST API — returns recent posts as JSON. Content is HTML; parsed with cheerio then sent to Gemini for extraction.",
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

  await prisma.scrapeSource.upsert({
    where: { sourceKey: "colorstack" },
    update: {},
    create: {
      label: "ColorStack",
      sourceKey: "colorstack",
      url: "https://app.colorstack.io/opportunities.data",
      parserType: "api",
      checkFrequency: "daily",
      notes:
        "ColorStack member opportunities feed. Requires OTP-authenticated session cookie stored in app_settings(colorstack_cookie). Session is set via the admin /admin/scrapers panel.",
    },
  });
  console.log("  ✓ ColorStack");

  await prisma.scrapeSource.upsert({
    where: { sourceKey: "workday" },
    update: {},
    create: {
      label: "Workday Talent Marketplace",
      sourceKey: "workday",
      url: "https://wd5.myworkday.com/uasys/internalapi/ccx/internalapi/talentMarketplace/v1/uasys/searchJobs",
      parserType: "api",
      checkFrequency: "daily",
      notes:
        "UA System Workday internal API. Only UAPB (Pine Bluff) jobs are imported. Requires session-secure-token stored in app_settings(workday_token), extracted from browser DevTools.",
    },
  });
  console.log("  ✓ Workday Talent Marketplace");

  console.log("\n✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
