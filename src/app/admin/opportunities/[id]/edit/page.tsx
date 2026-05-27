// src/app/admin/opportunities/[id]/edit/page.tsx
// Server shell that pre-loads the row and hands it to the shared form.

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OpportunityForm from "../../_components/OpportunityForm";

export const metadata = {
  title: "Edit Opportunity | UAPB Admin",
};

export default async function EditOpportunityPage({
  params,
}: {
  params: { id: string };
}) {
  const row = await prisma.opportunity.findUnique({
    where: { id: params.id },
  });
  if (!row) notFound();

  const isScraped = row.source !== "manual";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin"
          className="font-heading text-[10px] uppercase tracking-widest text-gray-500 hover:text-[#efa522]"
        >
          ← Back to opportunities
        </Link>
        <h1 className="font-display mt-2 text-3xl tracking-widest uppercase text-black">
          Edit Opportunity
        </h1>
        <p className="font-body mt-1 text-xs text-gray-500">
          Source: <span className="font-mono">{row.source}</span>
        </p>
      </div>

      {isScraped && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="font-heading text-[11px] uppercase tracking-widest text-amber-700">
            Scraped row
          </p>
          <p className="font-body mt-1">
            Edits here will be saved, but the next scheduled scrape may
            overwrite this row. To permanently override the scraper, archive
            the row instead.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <OpportunityForm mode="edit" initialValues={row} />
      </div>
    </div>
  );
}
