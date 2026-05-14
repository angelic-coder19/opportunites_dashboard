"use client";
// src/components/EmptyState.tsx

import { SearchX } from "lucide-react";

interface EmptyStateProps {
  query: string;
  onClear: () => void;
}

export default function EmptyState({ query, onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-20 px-6 text-center">
      <div className="mb-4 rounded-full bg-[#efa522]/10 p-5">
        <SearchX className="h-10 w-10 text-[#efa522]" />
      </div>
      <h3 className="font-heading text-xl font-bold text-gray-900">No results found</h3>
      <p className="font-body mt-2 max-w-sm text-sm text-gray-500">
        No opportunities match{" "}
        {query ? (
          <>
            your search for{" "}
            <span className="font-semibold text-gray-700">&ldquo;{query}&rdquo;</span>.
          </>
        ) : (
          "the current filters."
        )}{" "}
        Try adjusting your search terms or clearing your filters.
      </p>
      <button
        onClick={onClear}
        className="font-heading mt-6 rounded-xl bg-[#efa522] px-6 py-2.5 text-sm font-bold tracking-wide text-black hover:bg-[#d4901e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#efa522] focus:ring-offset-2"
      >
        Clear Search
      </button>
    </div>
  );
}
