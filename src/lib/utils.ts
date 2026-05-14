// src/lib/utils.ts

/**
 * Calculates the number of days remaining until a deadline.
 * @param deadline - ISO date string (YYYY-MM-DD)
 * @returns Number of days remaining (negative if past deadline)
 */
export function getDaysRemaining(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffMs = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if the given deadline has not yet passed.
 * @param deadline - ISO date string (YYYY-MM-DD)
 */
export function isActive(deadline: string): boolean {
  return getDaysRemaining(deadline) >= 0;
}

/**
 * Formats an ISO date string into a human-readable format.
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns e.g. "May 30, 2026"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Case-insensitive search across title, institution, and tags.
 * @param query - User's search input
 * @param title - Opportunity title
 * @param institution - Opportunity institution
 * @param tags - Optional array of tag strings
 */
export function matchesSearch(
  query: string,
  title: string,
  institution: string,
  tags?: string[]
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (title.toLowerCase().includes(q)) return true;
  if (institution.toLowerCase().includes(q)) return true;
  if (tags?.some((tag) => tag.toLowerCase().includes(q))) return true;
  return false;
}
