// Removes stale rows from the database so the public dashboard stays current.

import { prisma } from "@/lib/prisma";

function startOfTodayUtc(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

/** Delete opportunities whose deadline has passed (rolling/null deadlines are kept). */
export async function purgeExpiredOpportunities(): Promise<number> {
  const today = startOfTodayUtc();
  const result = await prisma.opportunity.deleteMany({
    where: {
      deadline: { not: null, lt: today },
    },
  });
  if (result.count > 0) {
    console.log(`[purge] Deleted ${result.count} expired opportunit${result.count === 1 ? "y" : "ies"}`);
  }
  return result.count;
}

/** Remove mock/placeholder rows seeded from opportunities.json (example.com URLs). */
export async function purgePlaceholderOpportunities(): Promise<number> {
  const result = await prisma.opportunity.deleteMany({
    where: {
      applicationUrl: { contains: "example.com", mode: "insensitive" },
    },
  });
  if (result.count > 0) {
    console.log(`[purge] Deleted ${result.count} placeholder opportunit${result.count === 1 ? "y" : "ies"}`);
  }
  return result.count;
}

export async function runOpportunityMaintenance(): Promise<void> {
  await purgePlaceholderOpportunities();
  await purgeExpiredOpportunities();
}
