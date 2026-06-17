// src/lib/share.ts
// Concise copy for social sharing and Open Graph previews.

import { opportunityPublicUrl } from "@/lib/opportunity-url";

type ShareFields = {
  id: string;
  title: string;
  institution: string;
  category: string;
  summary?: string | null;
  deadline?: Date | string | null;
};

function truncateAtWord(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.55 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trim()}…`;
}

function formatDeadlineShort(deadline: Date | string): string | null {
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function categoryLabel(category: string): string {
  return category === "Off-campus summer research program"
    ? "Research program"
    : "On-campus job";
}

/** One-line description for link previews (Open Graph / Twitter cards). */
export function buildShareDescription(opp: ShareFields): string {
  const label = categoryLabel(opp.category);
  const deadline = opp.deadline ? formatDeadlineShort(opp.deadline) : null;

  if (deadline) {
    return truncateAtWord(
      `${label} at ${opp.institution}. Apply by ${deadline}.`,
      120
    );
  }

  if (opp.summary) {
    return truncateAtWord(opp.summary, 120);
  }

  return `${label} at ${opp.institution}. Explore on the UAPB RIED Opportunities Dashboard.`;
}

/** Multi-line message shown alongside the shared link. */
export function buildShareText(opp: ShareFields): string {
  const label = categoryLabel(opp.category);
  const deadline = opp.deadline ? formatDeadlineShort(opp.deadline) : null;

  const metaParts = [opp.institution, label];
  if (deadline) metaParts.push(`Deadline ${deadline}`);

  return [opp.title, metaParts.join(" · ")].join("\n");
}

export function buildSharePayload(opp: ShareFields) {
  const url = opportunityPublicUrl(opp.id, opp.title);
  return {
    url,
    title: opp.title,
    text: buildShareText(opp),
    description: buildShareDescription(opp),
  };
}
