// src/lib/colorstack-parser.ts
// Parses ColorStack's Remix TurboStream loader format.
//   - N  → array index whose value is the actual key string
//   - V  → array index whose value is the actual value (primitive, array, or another object)
//   - V < 0 → null (backreference sentinel used by Remix for empty/null fields)
//
// Example fragment: arr[23] = {"_24":25} where arr[24]="id", arr[25]="abc123"
// resolves to { id: "abc123" }.

import {
  extractDeadlineFromRecord,
  extractDeadlineFromText,
} from "@/lib/scraper/date-utils";

export interface ColorStackTag {
  id: string;
  name: string;
  color: string;
}

export interface ColorStackOpportunity {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  posterId: string | null;
  posterFirstName: string | null;
  posterLastName: string | null;
  tags: ColorStackTag[];
  /** Parsed from list payload when available (e.g. expiresAt). */
  deadline: string | null;
}

export interface ColorStackDetail {
  id: string;
  title: string | null;
  description: string | null;
  externalLink: string | null;
  deadline: string | null;
  type: string | null;
}

// ─── Generic resolver ─────────────────────────────────────────────────────────

function resolveIdx(arr: unknown[], idx: number): unknown {
  if (idx < 0 || idx >= arr.length) return null;
  const val = arr[idx];
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) return (val as number[]).map((i) => resolveIdx(arr, i));
  if (typeof val === "object") {
    const result: Record<string, unknown> = {};
    for (const [rawKey, valueIdx] of Object.entries(val as Record<string, number>)) {
      if (!rawKey.startsWith("_")) continue;
      const keyIdx = parseInt(rawKey.slice(1), 10);
      const key = arr[keyIdx];
      if (typeof key !== "string") continue;
      result[key] = resolveIdx(arr, valueIdx);
    }
    return result;
  }
  return val; // primitive
}

function parseArray(raw: string): unknown[] {
  return JSON.parse(raw) as unknown[];
}

// ─── List endpoint parser ─────────────────────────────────────────────────────

export function parseOpportunitiesList(raw: string): ColorStackOpportunity[] {
  const arr = parseArray(raw);
  const root = resolveIdx(arr, 0) as Record<string, unknown>;

  // Find the route that holds opportunities data. ColorStack uses Remix nested
  // routes; the opportunities list lives under a key ending in ".opportunities".
  const routeData = findRouteData(root, ".opportunities");
  if (!routeData) return [];

  const data = (routeData as Record<string, unknown>).data as Record<string, unknown>;
  const rawOpps = data?.opportunities as unknown[] | undefined;
  if (!Array.isArray(rawOpps)) return [];

  return rawOpps
    .map((o) => castOpportunity(o as Record<string, unknown>))
    .filter((o): o is ColorStackOpportunity => o !== null);
}

// ─── Detail endpoint parser ───────────────────────────────────────────────────

export function parseOpportunityDetail(raw: string): ColorStackDetail | null {
  const arr = parseArray(raw);
  const root = resolveIdx(arr, 0) as Record<string, unknown>;

  // Find the route that holds the single opportunity. It's usually the deepest
  // route key (e.g. "routes/_profile.opportunities.$id" or similar).
  const routeData = findRouteData(root, ".$id") ?? findRouteData(root, "._id") ?? findDeepestRouteData(root);
  if (!routeData) return null;

  const data = (routeData as Record<string, unknown>).data as Record<string, unknown>;
  if (!data) return null;

  // Field names vary by ColorStack version; try common patterns.
  const opp =
    (data.opportunity as Record<string, unknown>) ??
    (data as Record<string, unknown>);

  return {
    id: str(opp.id) ?? "",
    title: str(opp.title),
    description: str(opp.description) ?? str(opp.summary) ?? str(opp.body),
    externalLink:
      str(opp.externalLink) ??
      str(opp.applicationUrl) ??
      str(opp.applyUrl) ??
      str(opp.link),
    deadline: extractColorStackDeadline(opp),
    type: str(opp.type) ?? str(opp.opportunityType),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findRouteData(
  root: Record<string, unknown>,
  suffix: string
): unknown | null {
  for (const [key, val] of Object.entries(root)) {
    if (key.includes(suffix)) return val;
  }
  return null;
}

function findDeepestRouteData(root: Record<string, unknown>): unknown | null {
  // Pick the route key with the most path segments (most specific).
  const routeKeys = Object.keys(root).filter((k) => k.startsWith("routes/"));
  if (routeKeys.length === 0) return null;
  routeKeys.sort((a, b) => b.split(".").length - a.split(".").length);
  return root[routeKeys[0]] ?? null;
}

function castOpportunity(o: Record<string, unknown>): ColorStackOpportunity | null {
  const id = str(o.id);
  const title = str(o.title);
  const companyName = str(o.companyName);
  if (!id || !title || !companyName) return null;

  const rawTags = (o.tags as unknown[]) ?? [];
  const tags: ColorStackTag[] = rawTags
    .map((t) => {
      const tag = t as Record<string, unknown>;
      return {
        id: str(tag.id) ?? "",
        name: str(tag.name) ?? "",
        color: str(tag.color) ?? "",
      };
    })
    .filter((t) => t.id && t.name);

  return {
    id,
    title,
    companyId: str(o.companyId) ?? "",
    companyName,
    companyLogo: str(o.companyLogo) ?? null,
    posterId: str(o.posterId) ?? null,
    posterFirstName: str(o.posterFirstName) ?? null,
    posterLastName: str(o.posterLastName) ?? null,
    tags,
    deadline: extractColorStackDeadline(o),
  };
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  return null;
}

function extractColorStackDeadline(opp: Record<string, unknown>): string | null {
  const fromRecord = extractDeadlineFromRecord(opp);
  if (fromRecord) return fromRecord;

  const description =
    str(opp.description) ?? str(opp.summary) ?? str(opp.body) ?? "";
  return extractDeadlineFromText(description);
}
