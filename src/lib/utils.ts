// src/lib/utils.ts

/**
 * Calculates the number of days remaining until a deadline.
 * Returns null for rolling/missing deadlines so callers can render them distinctly
 * instead of getting NaN.
 */
export function getDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) return null;
  deadlineDate.setHours(0, 0, 0, 0);
  const diffMs = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if the opportunity is still open. Rolling deadlines (null)
 * are always considered active.
 */
export function isActive(deadline: string | null): boolean {
  const days = getDaysRemaining(deadline);
  return days === null || days >= 0;
}

/**
 * Formats an ISO date string into a human-readable format.
 * Returns null for missing/invalid input so callers can decide what to render.
 */
export function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Case-insensitive search across title, institution, summary, and tags.
 * Multiple words are ANDed — each token must appear somewhere in the fields.
 */
export function matchesSearch(
  query: string,
  title: string,
  institution: string,
  tags?: string[],
  summary?: string | null
): boolean {
  const tokens = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = [title, institution, summary ?? "", ...(tags ?? [])]
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
}
