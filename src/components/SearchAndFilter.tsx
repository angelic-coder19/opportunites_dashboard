"use client";
// src/components/SearchAndFilter.tsx

import { Search, X, Briefcase, FlaskConical } from "lucide-react";
import { OpportunityCategory } from "@/types";

interface SearchAndFilterProps {
  query: string;
  onQueryChange: (value: string) => void;
  activeCategory: OpportunityCategory | "All";
  onCategoryChange: (cat: OpportunityCategory | "All") => void;
  totalCount: number;
  filteredCount: number;
}

const CATEGORIES: {
  label: string;
  value: OpportunityCategory | "All";
  icon?: React.ReactNode;
}[] = [
  { label: "All Opportunities", value: "All" },
  {
    label: "Research Programs",
    value: "Off-campus summer research program",
    icon: <FlaskConical className="h-4 w-4" />,
  },
  {
    label: "On-Campus Jobs",
    value: "On-campus job",
    icon: <Briefcase className="h-4 w-4" />,
  },
];

export default function SearchAndFilter({
  query,
  onQueryChange,
  activeCategory,
  onCategoryChange,
  totalCount,
  filteredCount,
}: SearchAndFilterProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search by title, institution, or keyword…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="font-body w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-10 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm
            focus:outline-none focus:ring-2 focus:ring-[#efa522] focus:border-[#efa522] transition"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category toggles + result count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ label, value, icon }) => {
            const isActive = activeCategory === value;
            return (
              <button
                key={value}
                onClick={() => onCategoryChange(value)}
                className={`font-heading inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-[#efa522] focus:ring-offset-1
                  ${isActive
                    ? "bg-[#efa522] text-black shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>

        <p className="font-body text-sm text-gray-500">
          Showing{" "}
          <span className="font-bold text-gray-900">{filteredCount}</span> of{" "}
          <span className="font-bold text-gray-900">{totalCount}</span>{" "}
          {totalCount === 1 ? "opportunity" : "opportunities"}
        </p>
      </div>
    </div>
  );
}
