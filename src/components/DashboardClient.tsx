"use client";
// src/components/DashboardClient.tsx

import { useState, useMemo } from "react";
import { Opportunity } from "@/types";
import { getDaysRemaining, matchesSearch } from "@/lib/utils";
import OpportunityCard from "@/components/OpportunityCard";
import SearchAndFilter from "@/components/SearchAndFilter";
import EmptyState from "@/components/EmptyState";

interface DashboardClientProps {
  opportunities: Opportunity[];
}

type CategoryFilter = Opportunity["category"] | "All";

const MAX_TOPIC_FILTERS = 8;
const CLOSING_SOON_DAYS = 14;

function getPopularTags(opportunities: Opportunity[]): string[] {
  const counts = new Map<string, number>();
  for (const opp of opportunities) {
    for (const tag of opp.tags ?? []) {
      const normalized = tag.trim();
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_TOPIC_FILTERS)
    .map(([tag]) => tag);
}

export default function DashboardClient({ opportunities }: DashboardClientProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [closingSoon, setClosingSoon] = useState(false);
  const [activeTag, setActiveTag] = useState("");

  const popularTags = useMemo(
    () => getPopularTags(opportunities),
    [opportunities]
  );

  const filtered = useMemo(() => {
    return opportunities.filter((opp) => {
      const categoryMatch =
        activeCategory === "All" || opp.category === activeCategory;

      const tagMatch =
        !activeTag ||
        (opp.tags ?? []).some(
          (t) => t.toLowerCase() === activeTag.toLowerCase()
        );

      const searchMatch = matchesSearch(
        query,
        opp.title,
        opp.institution,
        opp.tags,
        opp.summary
      );

      const daysLeft = getDaysRemaining(opp.deadline);
      const closingSoonMatch =
        !closingSoon ||
        (daysLeft !== null && daysLeft >= 0 && daysLeft <= CLOSING_SOON_DAYS);

      return categoryMatch && tagMatch && searchMatch && closingSoonMatch;
    });
  }, [opportunities, query, activeCategory, activeTag, closingSoon]);

  function clearAll() {
    setQuery("");
    setActiveCategory("All");
    setClosingSoon(false);
    setActiveTag("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <SearchAndFilter
          query={query}
          onQueryChange={setQuery}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          closingSoon={closingSoon}
          onClosingSoonChange={setClosingSoon}
          activeTag={activeTag}
          onTagChange={setActiveTag}
          popularTags={popularTags}
          totalCount={opportunities.length}
          filteredCount={filtered.length}
          onClearAll={clearAll}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState query={query} onClear={clearAll} />
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
