"use client";
// src/components/SearchAndFilter.tsx

import { Search, X } from "lucide-react";
import { OpportunityCategory } from "@/types";

interface SearchAndFilterProps {
  query: string;
  onQueryChange: (value: string) => void;
  activeCategory: OpportunityCategory | "All";
  onCategoryChange: (cat: OpportunityCategory | "All") => void;
  closingSoon: boolean;
  onClosingSoonChange: (value: boolean) => void;
  activeTag: string;
  onTagChange: (tag: string) => void;
  popularTags: string[];
  totalCount: number;
  filteredCount: number;
  onClearAll: () => void;
}

const TYPE_FILTERS: {
  label: string;
  value: OpportunityCategory | "All";
}[] = [
  { label: "All", value: "All" },
  { label: "Research", value: "Off-campus summer research program" },
  { label: "On-campus", value: "On-campus job" },
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-heading inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#efa522]
        ${active
          ? "bg-[#efa522] text-black"
          : "bg-white text-gray-600 border border-gray-200 hover:border-[#efa522]/40 hover:text-[#efa522]"
        }`}
    >
      {children}
    </button>
  );
}

export default function SearchAndFilter({
  query,
  onQueryChange,
  activeCategory,
  onCategoryChange,
  closingSoon,
  onClosingSoonChange,
  activeTag,
  onTagChange,
  popularTags,
  totalCount,
  filteredCount,
  onClearAll,
}: SearchAndFilterProps) {
  const hasFilters =
    query.trim() !== "" ||
    activeCategory !== "All" ||
    closingSoon ||
    activeTag !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search by title, company, or keyword…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="font-body w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-10 text-sm text-gray-900 shadow-sm placeholder:text-gray-400
            focus:border-[#efa522] focus:outline-none focus:ring-2 focus:ring-[#efa522]/30 transition"
          aria-label="Search opportunities"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map(({ label, value }) => (
          <FilterChip
            key={value}
            active={activeCategory === value}
            onClick={() => onCategoryChange(value)}
          >
            {label}
          </FilterChip>
        ))}
        <FilterChip
          active={closingSoon}
          onClick={() => onClosingSoonChange(!closingSoon)}
        >
          Closing soon
        </FilterChip>
      </div>

      {popularTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-[10px] uppercase tracking-widest text-gray-400 shrink-0">
            Topics
          </span>
          {popularTags.map((tag) => (
            <FilterChip
              key={tag}
              active={activeTag === tag}
              onClick={() => onTagChange(activeTag === tag ? "" : tag)}
            >
              {tag}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-0.5">
        <p className="font-body text-sm text-gray-500">
          Showing{" "}
          <span className="font-bold text-gray-900">{filteredCount}</span>
          {" of "}
          <span className="font-bold text-gray-900">{totalCount}</span>
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="font-heading inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-[#efa522] hover:text-[#efa522] transition"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
