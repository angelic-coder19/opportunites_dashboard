"use client";

// src/app/page.tsx

import { useState, useMemo } from "react";
import opportunitiesData from "@/data/opportunities.json";
import { Opportunity, OpportunityCategory } from "@/types";
import { matchesSearch } from "@/lib/utils";
import OpportunityCard from "@/components/OpportunityCard";
import SearchAndFilter from "@/components/SearchAndFilter";
import EmptyState from "@/components/EmptyState";

// Cast the raw JSON import to our typed array
const allOpportunities = opportunitiesData as Opportunity[];

export default function DashboardPage() {
  const [query, setQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<
    OpportunityCategory | "All"
  >("All");

  /** Filtered + searched opportunities (memoised for performance) */
  const filtered = useMemo(() => {
    return allOpportunities.filter((opp) => {
      const categoryMatch =
        activeCategory === "All" || opp.category === activeCategory;
      const searchMatch = matchesSearch(
        query,
        opp.title,
        opp.institution,
        opp.tags
      );
      return categoryMatch && searchMatch;
    });
  }, [query, activeCategory]);

  const handleClearAll = () => {
    setQuery("");
    setActiveCategory("All");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* ── Search & Filter bar ─────────────────────────────────── */}
      <div className="mb-8">
        <SearchAndFilter
          query={query}
          onQueryChange={setQuery}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          totalCount={allOpportunities.length}
          filteredCount={filtered.length}
        />
      </div>

      {/* ── Opportunity grid / empty state ───────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState query={query} onClear={handleClearAll} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}
