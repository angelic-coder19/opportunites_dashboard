"use client";
// src/components/DashboardClient.tsx
// Owns all filtering state. Receives opportunities from the Server Component
// parent (page.tsx) which reads directly from the database.

import { useState, useMemo } from "react";
import { Opportunity } from "@/types";
import { matchesSearch } from "@/lib/utils";
import OpportunityCard from "@/components/OpportunityCard";
import SearchAndFilter from "@/components/SearchAndFilter";
import EmptyState from "@/components/EmptyState";

interface DashboardClientProps {
  opportunities: Opportunity[];
}

type CategoryFilter = Opportunity["category"] | "All";

export default function DashboardClient({ opportunities }: DashboardClientProps) {
  const [query, setQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");

  const filtered = useMemo(() => {
    return opportunities.filter((opp) => {
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
  }, [opportunities, query, activeCategory]);

  const handleClearAll = () => {
    setQuery("");
    setActiveCategory("All");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <SearchAndFilter
          query={query}
          onQueryChange={setQuery}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          totalCount={opportunities.length}
          filteredCount={filtered.length}
        />
      </div>

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