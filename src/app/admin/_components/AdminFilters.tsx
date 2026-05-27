"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_SOURCES,
} from "@/types/admin";

const SEARCH_DEBOUNCE_MS = 300;

export default function AdminFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(sp.get("q") ?? "");

  // Push search to URL after debounce.
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      params.delete("page"); // any filter change resets to page 1
      startTransition(() => router.push(`/admin?${params.toString()}`));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`/admin?${params.toString()}`));
  }

  const selectClass =
    "font-body rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-[#efa522] focus:outline-none focus:ring-2 focus:ring-[#efa522]/30";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="font-heading flex flex-col gap-1 text-[10px] uppercase tracking-widest text-gray-500">
        Search
        <input
          type="search"
          placeholder="Title or institution…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="font-body w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-[#efa522] focus:outline-none focus:ring-2 focus:ring-[#efa522]/30"
        />
      </label>

      <label className="font-heading flex flex-col gap-1 text-[10px] uppercase tracking-widest text-gray-500">
        Status
        <select
          className={selectClass}
          value={sp.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">All</option>
          {OPPORTUNITY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="font-heading flex flex-col gap-1 text-[10px] uppercase tracking-widest text-gray-500">
        Category
        <select
          className={selectClass}
          value={sp.get("category") ?? ""}
          onChange={(e) => setParam("category", e.target.value)}
        >
          <option value="">All</option>
          {OPPORTUNITY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="font-heading flex flex-col gap-1 text-[10px] uppercase tracking-widest text-gray-500">
        Source
        <select
          className={selectClass}
          value={sp.get("source") ?? ""}
          onChange={(e) => setParam("source", e.target.value)}
        >
          <option value="">All</option>
          {OPPORTUNITY_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {pending && (
        <span className="font-body text-xs text-gray-400">Loading…</span>
      )}
    </div>
  );
}
