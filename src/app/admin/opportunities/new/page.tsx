// src/app/admin/opportunities/new/page.tsx
// Server shell for the "new opportunity" form.

import Link from "next/link";
import OpportunityForm from "../_components/OpportunityForm";

export const metadata = {
  title: "New Opportunity | UAPB Admin",
};

export default function NewOpportunityPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <Link
            href="/admin"
            className="font-heading text-[10px] uppercase tracking-widest text-gray-500 hover:text-[#efa522]"
          >
            ← Back to opportunities
          </Link>
          <h1 className="font-display mt-2 text-3xl tracking-widest uppercase text-black">
            New Opportunity
          </h1>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <OpportunityForm mode="create" />
      </div>
    </div>
  );
}
