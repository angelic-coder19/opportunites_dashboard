// src/app/admin/page.tsx
// Server-rendered admin list. Reads filters from search params, runs a
// $transaction for consistent count + page, renders a Tailwind table.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  OpportunityListQuerySchema,
  PAGE_SIZE,
} from "@/lib/validation/opportunity";
import AdminFilters from "./_components/AdminFilters";
import StatusToggle from "./_components/StatusToggle";
import DeleteButton from "./_components/DeleteButton";
import type { OpportunityStatus } from "@/types/admin";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function statusPill(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-50 text-green-700 border-green-200",
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    archived: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`font-heading inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${map[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
    >
      {status}
    </span>
  );
}

function sourcePill(source: string) {
  const isManual = source === "manual";
  return (
    <span
      className={`font-body inline-block rounded-full px-2 py-0.5 text-[10px] ${isManual ? "bg-[#efa522]/10 text-[#c47d0a]" : "bg-gray-100 text-gray-600"}`}
    >
      {source.replace(/^scrape_/, "")}
    </span>
  );
}

export default async function AdminListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Flatten searchParams (Next can pass arrays). Then validate.
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string") flat[k] = v;
  }
  const parsed = OpportunityListQuerySchema.safeParse(flat);
  const { page, q, status, category, source } = parsed.success
    ? parsed.data
    : { page: 1, q: undefined, status: undefined, category: undefined, source: undefined };

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(source ? { source } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { institution: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.opportunity.count({ where }),
    prisma.opportunity.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (status) baseParams.set("status", status);
  if (category) baseParams.set("category", category);
  if (source) baseParams.set("source", source);

  function pageHref(p: number) {
    const sp = new URLSearchParams(baseParams);
    sp.set("page", String(p));
    return `/admin?${sp.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header row: title + new button */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-widest uppercase text-black">
            Opportunities
          </h1>
          <p className="font-body mt-1 text-sm text-gray-500">
            {total} {total === 1 ? "row" : "rows"} matching current filters
          </p>
        </div>
        <Link
          href="/admin/opportunities/new"
          className="font-heading rounded-xl bg-[#efa522] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-[#d4901e]"
        >
          + New Opportunity
        </Link>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <AdminFilters />
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="font-body text-sm text-gray-500">
            No opportunities match these filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="font-heading px-4 py-3">Title</th>
                <th className="font-heading px-4 py-3">Institution</th>
                <th className="font-heading px-4 py-3">Category</th>
                <th className="font-heading px-4 py-3">Status</th>
                <th className="font-heading px-4 py-3">Source</th>
                <th className="font-heading px-4 py-3">Deadline</th>
                <th className="font-heading px-4 py-3">Updated</th>
                <th className="font-heading px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="font-body px-4 py-3 text-sm text-gray-900">
                    <Link
                      href={`/admin/opportunities/${row.id}/edit`}
                      className="hover:text-[#efa522]"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="font-body px-4 py-3 text-sm text-gray-600">
                    {row.institution}
                  </td>
                  <td className="font-body px-4 py-3 text-xs text-gray-600">
                    {row.category}
                  </td>
                  <td className="px-4 py-3">{statusPill(row.status)}</td>
                  <td className="px-4 py-3">{sourcePill(row.source)}</td>
                  <td className="font-body px-4 py-3 text-xs text-gray-600">
                    {formatDate(row.deadline)}
                  </td>
                  <td className="font-body px-4 py-3 text-xs text-gray-500">
                    {row.updatedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      <Link
                        href={`/admin/opportunities/${row.id}/edit`}
                        className="font-heading rounded-md border border-gray-300 px-2 py-1 text-[10px] uppercase tracking-widest text-gray-700 hover:border-[#efa522] hover:text-[#efa522]"
                      >
                        Edit
                      </Link>
                      <StatusToggle
                        id={row.id}
                        currentStatus={row.status as OpportunityStatus}
                      />
                      <DeleteButton
                        id={row.id}
                        enabled={row.source === "manual"}
                        title={row.title}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-body text-xs text-gray-500">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex gap-2">
            {safePage > 1 && (
              <Link
                href={pageHref(safePage - 1)}
                className="font-heading rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] uppercase tracking-widest text-gray-700 hover:border-[#efa522] hover:text-[#efa522]"
              >
                ← Prev
              </Link>
            )}
            {safePage < totalPages && (
              <Link
                href={pageHref(safePage + 1)}
                className="font-heading rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] uppercase tracking-widest text-gray-700 hover:border-[#efa522] hover:text-[#efa522]"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
