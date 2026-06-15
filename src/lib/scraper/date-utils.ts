// Shared deadline parsing for scrapers.

/** Normalize common date strings to YYYY-MM-DD. */
export function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

const DEADLINE_PATTERNS: RegExp[] = [
  /Closing Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  /Application Deadline:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  /Apply by:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  /Due Date:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  /Deadline:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  /Deadline:?\s*(\d{4}-\d{2}-\d{2})/i,
  /closes?\s+(?:on\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i,
  /open until:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
];

/** Pull the first recognizable deadline from free text or HTML-ish content. */
export function extractDeadlineFromText(text: string): string | null {
  if (!text) return null;
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const re of DEADLINE_PATTERNS) {
    const match = plain.match(re);
    if (match) {
      const parsed = parseFlexibleDate(match[1]);
      if (parsed) return parsed;
    }
  }
  return null;
}

/** Parse a labeled field map (e.g. Pathways detail page) for deadline-like values. */
export function extractDeadlineFromFields(
  fields: Record<string, string>
): string | null {
  for (const [label, value] of Object.entries(fields)) {
    if (!/deadline|closing|apply by|due date|last day/i.test(label)) continue;
    const parsed = parseFlexibleDate(value) ?? extractDeadlineFromText(value);
    if (parsed) return parsed;
  }
  return null;
}
