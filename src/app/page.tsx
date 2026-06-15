// src/app/page.tsx
// Server Component — fetches opportunities directly from Neon via Prisma.
// No "use client" here: this runs on the server at request time.

import type { Opportunity as DbOpportunity } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { Opportunity } from "@/types";
import DashboardClient from "@/components/DashboardClient";
import { runOpportunityMaintenance } from "@/lib/purge-opportunities";

export const revalidate = 60; // ISR: rebuild this page at most once per minute

async function getOpportunities(): Promise<Opportunity[]> {
  await runOpportunityMaintenance();

  const today = new Date();
  today.setHours(0, 0, 0, 0); // compare at day boundary (UTC midnight)

  const rows = await prisma.opportunity.findMany({
    where: {
      status: "active",
      // Exclude past-deadline rows. Null deadline = open-ended, always shown.
      OR: [
        { deadline: null },
        { deadline: { gte: today } },
      ],
    },
    orderBy: [
      { isFeatured: "desc" }, // featured listings appear first
      { deadline: "asc" },    // then soonest deadline first
      { createdAt: "desc" },
    ],
  });

  // Map Prisma rows → the Opportunity interface the components expect.
  // Prisma returns Date objects; the interface uses ISO strings.
  return rows.map((row: DbOpportunity) => ({
    id: row.id,
    title: row.title,
    institution: row.institution,
    summary: row.summary,
    category: row.category as Opportunity["category"],
    deadline: row.deadline?.toISOString().split("T")[0] ?? null,
    datePosted: row.datePosted?.toISOString().split("T")[0] ?? null,
    applicationUrl: row.applicationUrl ?? "",
    contactEmail: row.contactEmail ?? undefined,
    contactPhone: row.contactPhone ?? undefined,
    tags: row.tags,
  }));
}

export default async function DashboardPage() {
  const opportunities = await getOpportunities();

  return <DashboardClient opportunities={opportunities} />;
}