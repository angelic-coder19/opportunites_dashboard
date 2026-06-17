// Shared deadline parsing for scrapers.

function startOfTodayUtc(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function addDaysFromToday(days: number): string {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

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

/** Parse relative phrases like "Expires in 25d" or "Expires in 2 weeks". */
export function parseRelativeDeadline(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const patterns: Array<[RegExp, (n: number) => string]> = [
    [/expires?\s+in\s+(\d+)\s*d(?:ays?)?(?:\b|$)/i, addDaysFromToday],
    [/(?:expires?\s+in|^in)\s+(\d+)\s*w(?:eeks?)?(?:\b|$)/i, (n) => addDaysFromToday(n * 7)],
    [/expires?\s+in\s+(\d+)\s*m(?:onths?)?(?:\b|$)/i, (n) => {
      const d = startOfTodayUtc();
      d.setUTCMonth(d.getUTCMonth() + n);
      return d.toISOString().slice(0, 10);
    }],
    [/(\d+)\s+days?\s+(?:left|remaining)/i, addDaysFromToday],
  ];

  for (const [re, calc] of patterns) {
    const match = normalized.match(re);
    if (match) return calc(parseInt(match[1], 10));
  }

  return null;
}

function parseTimestamp(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const ms = value > 1e12 ? value : value * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
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
  /expires?\s+(?:on\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i,
  /expires?\s+(?:on\s+)?(\d{4}-\d{2}-\d{2})/i,
];

/** Pull the first recognizable deadline from free text or HTML-ish content. */
export function extractDeadlineFromText(text: string): string | null {
  if (!text) return null;

  const relative = parseRelativeDeadline(text);
  if (relative) return relative;

  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const re of DEADLINE_PATTERNS) {
    const match = plain.match(re);
    if (match) {
      const parsed = parseFlexibleDate(match[1]);
      if (parsed) return parsed;
    }
  }

  return parseRelativeDeadline(plain);
}

/** Parse a labeled field map (e.g. Pathways detail page) for deadline-like values. */
export function extractDeadlineFromFields(
  fields: Record<string, string>
): string | null {
  for (const [label, value] of Object.entries(fields)) {
    if (!/deadline|closing|apply by|due date|last day|expires?/i.test(label)) {
      continue;
    }
    const parsed =
      parseFlexibleDate(value) ??
      parseRelativeDeadline(value) ??
      extractDeadlineFromText(value);
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Scan a platform record for deadline-like keys and values.
 * Works across ColorStack, Workday JSON, and similar APIs.
 */
export function extractDeadlineFromRecord(
  record: Record<string, unknown>
): string | null {
  const exactKeys = [
    "deadline",
    "closesAt",
    "closeAt",
    "expiresAt",
    "expireAt",
    "expirationDate",
    "applicationDeadline",
    "dueDate",
    "endDate",
    "closeDate",
    "dueAt",
    "closingDate",
    "recruitingEndDate",
    "postingEndDate",
  ];

  for (const key of exactKeys) {
    const value = record[key];
    if (typeof value === "string") {
      const parsed = parseFlexibleDate(value) ?? parseRelativeDeadline(value);
      if (parsed) return parsed;
    }
    if (typeof value === "number") {
      const parsed = parseTimestamp(value);
      if (parsed) return parsed;
    }
  }

  const relativeDays = record.expiresInDays ?? record.daysUntilExpiration;
  if (typeof relativeDays === "number" && relativeDays > 0 && relativeDays < 400) {
    return addDaysFromToday(relativeDays);
  }

  for (const [key, value] of Object.entries(record)) {
    if (!/deadline|expir|clos|due|end.?date|recruit.*end|last.?day/i.test(key)) {
      continue;
    }
    if (typeof value === "number") {
      const parsed = parseTimestamp(value);
      if (parsed) return parsed;
    }
    if (typeof value === "string") {
      const parsed =
        parseFlexibleDate(value) ??
        parseRelativeDeadline(value) ??
        extractDeadlineFromText(value);
      if (parsed) return parsed;
    }
  }

  for (const value of Object.values(record)) {
    if (typeof value === "string") {
      const relative = parseRelativeDeadline(value);
      if (relative) return relative;
    }
  }

  return null;
}
