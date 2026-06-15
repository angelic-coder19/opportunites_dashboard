"use client";

// src/components/CountdownBadge.tsx

import { getDaysRemaining } from "@/lib/utils";

interface CountdownBadgeProps {
  deadline: string | null; // ISO Date string (YYYY-MM-DD), or null for rolling
}

export default function CountdownBadge({ deadline }: CountdownBadgeProps) {
  const daysLeft = getDaysRemaining(deadline);

  if (daysLeft === null) {
    return (
      <span className="font-heading inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        Rolling Deadline
      </span>
    );
  }

  if (daysLeft < 0) {
    return (
      <span className="font-heading inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 border border-gray-200">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        Closed
      </span>
    );
  }

  if (daysLeft === 0) {
    return (
      <span className="font-heading inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        Due Today
      </span>
    );
  }

  if (daysLeft <= 14) {
    return (
      <span className="font-heading inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        {daysLeft} {daysLeft === 1 ? "Day" : "Days"} Left
      </span>
    );
  }

  return (
    <span className="font-heading inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 border border-green-200">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      {daysLeft} Days Left
    </span>
  );
}
