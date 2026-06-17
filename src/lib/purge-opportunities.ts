// Removes stale, placeholder, and invalid rows from the database.

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

/** Remove mock, placeholder, and incomplete rows that should not appear publicly. */
export async function purgeInvalidOpportunities(): Promise<number> {
  const result = await prisma.opportunity.deleteMany({
    where: {
      OR: [
        { applicationUrl: { contains: "example.com", mode: "insensitive" } },
        { applicationUrl: { contains: "placeholder", mode: "insensitive" } },
        { applicationUrl: { contains: "localhost", mode: "insensitive" } },
        {
          AND: [
            { applicationUrl: null },
            { source: "manual" },
          ],
        },
        {
          AND: [
            { applicationUrl: "" },
            { source: "manual" },
          ],
        },
        {
          source: "scrape_pathways",
          applicationUrl: { contains: "pathwaystoscience.org", mode: "insensitive" },
        },
        { title: { contains: "test opportunity", mode: "insensitive" } },
        { title: { contains: "lorem ipsum", mode: "insensitive" } },
        { institution: { in: ["Unknown Institution", "TBD", "N/A", "Example University"] } },
      ],
    },
  });

  if (result.count > 0) {
    console.log(`[purge] Deleted ${result.count} invalid opportunit${result.count === 1 ? "y" : "ies"}`);
  }
  return result.count;
}

/** @deprecated Use purgeInvalidOpportunities */
export async function purgePlaceholderOpportunities(): Promise<number> {
  return purgeInvalidOpportunities();
}

export async function runOpportunityMaintenance(): Promise<{
  deletedInvalid: number;
  deletedExpired: number;
}> {
  const deletedInvalid = await purgeInvalidOpportunities();
  const deletedExpired = await purgeExpiredOpportunities();
  return { deletedInvalid, deletedExpired };
}
