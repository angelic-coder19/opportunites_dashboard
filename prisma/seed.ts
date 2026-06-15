// prisma/seed.ts
// Run with: npx prisma db seed

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { ensureAllScrapeSources } from "../src/lib/scraper/scrape-sources";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding scrape sources...");
  await ensureAllScrapeSources();
  for (const key of ["reufinder", "pathways", "colorstack", "workday"]) {
    console.log(`  ✓ ${key}`);
  }
  console.log("\n✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
