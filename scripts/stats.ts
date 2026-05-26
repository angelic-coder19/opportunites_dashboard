import { prisma } from "../src/lib/prisma";

async function main() {
  const counts = await prisma.opportunity.groupBy({
    by: ["source"],
    _count: { _all: true },
  });

  const pathwaysStats = await prisma.$queryRaw<
    { min: number; max: number; avg: string; rich_count: bigint }[]
  >`
    SELECT
      MIN(array_length(tags, 1)) as min,
      MAX(array_length(tags, 1)) as max,
      ROUND(AVG(array_length(tags, 1))::numeric, 1) as avg,
      COUNT(*) FILTER (WHERE array_length(tags, 1) >= 5) as rich_count
    FROM opportunities
    WHERE source = 'scrape_pathways'
  `;

  const pathwaysWithDeadline = await prisma.opportunity.count({
    where: { source: "scrape_pathways", deadline: { not: null } },
  });
  const pathwaysTotal = await prisma.opportunity.count({
    where: { source: "scrape_pathways" },
  });

  // Spot check — find any rows with weak data
  const weakInstitution = await prisma.opportunity.count({
    where: {
      source: "scrape_pathways",
      OR: [
        { institution: "Unknown Institution" },
        { institution: "Multiple Institutions" },
      ],
    },
  });

  const stillPathwaysUrl = await prisma.opportunity.count({
    where: {
      source: "scrape_pathways",
      applicationUrl: { contains: "pathwaystoscience.org" },
    },
  });

  console.log("Source counts:", counts);
  console.log("Pathways tag stats:", pathwaysStats);
  console.log(
    `Pathways with deadlines: ${pathwaysWithDeadline}/${pathwaysTotal}`
  );
  console.log(
    `Pathways with Unknown/Multiple Institution: ${weakInstitution}/${pathwaysTotal}`
  );
  console.log(
    `Pathways still pointing at pathwaystoscience.org: ${stillPathwaysUrl}/${pathwaysTotal} (should be 0)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
