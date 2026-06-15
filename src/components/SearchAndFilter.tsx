"use client";
// src/components/SearchAndFilter.tsx

import { useEffect, useRef, useState } from "react";
import {
  Search,
  X,
  Briefcase,
  FlaskConical,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { OpportunityCategory } from "@/types";

interface SearchAndFilterProps {
  query: string;
  onQueryChange: (value: string) => void;
  activeCategory: OpportunityCategory | "All";
  onCategoryChange: (cat: OpportunityCategory | "All") => void;
  activeTag: string;
  onTagChange: (tag: string) => void;
  popularTags: string[];
  totalCount: number;
  filteredCount: number;
  onClearAll: () => void;
}

const CATEGORIES: {
  label: string;
  value: OpportunityCategory | "All";
  icon?: React.ReactNode;
}[] = [
  { label: "All types", value: "All" },
  {
    label: "Research",
    value: "Off-campus summer research program",
    icon: <FlaskConical className="h-3.5 w-3.5" aria-hidden />,
  },
  {
    label: "On-Campus",
    value: "On-campus job",
    icon: <Briefcase className="h-3.5 w-3.5" aria-hidden />,
  },
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
      className={`font-heading inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors
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
  activeTag,
  onTagChange,
  popularTags,
  totalCount,
  filteredCount,
  onClearAll,
}: SearchAndFilterProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    (activeCategory !== "All" ? 1 : 0) + (activeTag ? 1 : 0);
  const hasFilters = query.trim() !== "" || activeFilterCount > 0;

  useEffect(() => {
    if (!filtersOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [filtersOpen]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search opportunities…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="font-body h-full w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-10 text-sm text-gray-900 shadow-sm placeholder:text-gray-400
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

        <div className="relative shrink-0" ref={panelRef}>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-haspopup="true"
            className={`font-heading flex h-full w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold tracking-wide transition-colors sm:w-auto
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#efa522]
              ${filtersOpen || activeFilterCount > 0
                ? "border-[#efa522] bg-[#efa522]/10 text-black"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#efa522] px-1.5 text-[10px] font-bold text-black">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          {filtersOpen && (
            <div
              className="absolute right-0 z-20 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:w-80"
              role="dialog"
              aria-label="Filter opportunities"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="font-heading text-[10px] uppercase tracking-widest text-gray-400">
                  Refine results
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onCategoryChange("All");
                      onTagChange("");
                    }}
                    className="font-heading text-[10px] uppercase tracking-widest text-[#c47d0a] hover:text-[#efa522]"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-heading mb-2 text-[10px] uppercase tracking-widest text-gray-400">
                    Type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(({ label, value, icon }) => (
                      <FilterChip
                        key={value}
                        active={activeCategory === value}
                        onClick={() => onCategoryChange(value)}
                      >
                        {icon}
                        {label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                {popularTags.length > 0 && (
                  <div>
                    <p className="font-heading mb-2 text-[10px] uppercase tracking-widest text-gray-400">
                      Topic
                    </p>
                    <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                      <FilterChip
                        active={activeTag === ""}
                        onClick={() => onTagChange("")}
                      >
                        All topics
                      </FilterChip>
                      {popularTags.map((tag) => (
                        <FilterChip
                          key={tag}
                          active={activeTag === tag}
                          onClick={() =>
                            onTagChange(activeTag === tag ? "" : tag)
                          }
                        >
                          {tag}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!filtersOpen && activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeCategory !== "All" && (
            <span className="font-heading inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">
              {CATEGORIES.find((c) => c.value === activeCategory)?.label}
              <button
                type="button"
                onClick={() => onCategoryChange("All")}
                className="rounded-full p-0.5 hover:bg-gray-200"
                aria-label="Remove type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {activeTag && (
            <span className="font-heading inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">
              {activeTag}
              <button
                type="button"
                onClick={() => onTagChange("")}
                className="rounded-full p-0.5 hover:bg-gray-200"
                aria-label="Remove topic filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-0.5">
        <p className="font-body text-sm text-gray-500">
          <span className="font-bold text-gray-900">{filteredCount}</span>
          {" of "}
          <span className="font-bold text-gray-900">{totalCount}</span>{" "}
          {totalCount === 1 ? "opportunity" : "opportunities"}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="font-heading inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-[#efa522] hover:text-[#efa522] transition"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
