// src/lib/scraper/index.ts
// Shared utilities used by all scrapers.

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { ScrapeSource, ScrapeRun } from "@prisma/client";

export function hashContent(html: string): string {
  return crypto.createHash("sha256").update(html).digest("hex");
}

/** Returns the ScrapeSource row for a given key, or throws if not found. */
export async function getSource(sourceKey: string): Promise<ScrapeSource> {
  const source = await prisma.scrapeSource.findUnique({
    where: { sourceKey },
  });
  if (!source) throw new Error(`Scrape source not found: ${sourceKey}`);
  if (!source.isActive) throw new Error(`Scrape source is disabled: ${sourceKey}`);
  return source;
}

/**
 * Compares newHash against the stored content hash.
 * Returns true if the content has changed (or no hash is stored yet).
 */
export async function hasContentChanged(
  sourceId: string,
  newHash: string
): Promise<boolean> {
  const source = await prisma.scrapeSource.findUnique({
    where: { id: sourceId },
    select: { contentHash: true },
  });
  return source?.contentHash !== newHash;
}

/** Updates the stored content hash and timestamps after a successful parse. */
export async function updateContentHash(
  sourceId: string,
  newHash: string
): Promise<void> {
  await prisma.scrapeSource.update({
    where: { id: sourceId },
    data: {
      contentHash: newHash,
      lastCheckedAt: new Date(),
      lastChangedAt: new Date(),
      consecutiveEmptyRuns: 0,
    },
  });
}

/** Records that the page was checked but content had not changed. */
export async function recordNoChange(sourceId: string): Promise<void> {
  await prisma.scrapeSource.update({
    where: { id: sourceId },
    data: {
      lastCheckedAt: new Date(),
      consecutiveEmptyRuns: { increment: 1 },
    },
  });
}

/** Creates a scrape_runs row and returns it. */
export async function startRun(sourceId: string): Promise<ScrapeRun> {
  return prisma.scrapeRun.create({
    data: { sourceId, status: "running" },
  });
}

export interface RunResult {
  found: number;
  added: number;
  skipped: number;
  tokens?: number;
  error?: string;
}

/** Finalises a scrape_runs row. */
export async function finishRun(
  runId: string,
  status: "success" | "failed" | "skipped",
  result: RunResult,
  contentChanged: boolean
): Promise<void> {
  await prisma.scrapeRun.update({
    where: { id: runId },
    data: {
      status,
      completedAt: new Date(),
      contentChanged,
      opportunitiesFound: result.found,
      opportunitiesAdded: result.added,
      opportunitiesSkipped: result.skipped,
      llmTokensUsed: result.tokens ?? 0,
      errorMessage: result.error ?? null,
    },
  });
}

export interface ExtractedOpportunity {
  title: string;
  institution: string;
  summary: string;
  deadline: string | null;          // YYYY-MM-DD or null
  applicationUrl: string | null;
  contactEmail: string | null;
  citizenshipReq: string | null;
  levels: string | null;
  tags: string[];
}

/**
 * Attempts to insert one opportunity.
 * Returns 'added' or 'skipped' (already exists).
 */
export async function insertOpportunity(
  data: ExtractedOpportunity,
  source: string,
  sourceId: string,
  sourceUrl?: string
): Promise<"added" | "skipped"> {
  // Required by the Opportunity schema. Gemini occasionally omits these even
  // though the prompt marks them required, so we skip rather than insert junk.
  if (!data.title?.trim() || !data.institution?.trim()) {
    console.warn(
      `[scraper] Skipping ${source}/${sourceId}: missing required field (title="${data.title}", institution="${data.institution}")`
    );
    return "skipped";
  }

  const existing = await prisma.opportunity.findUnique({
    where: { source_sourceId: { source, sourceId } },
  });
  if (existing) return "skipped";

  const extraTags: string[] = [];
  if (data.citizenshipReq) extraTags.push(data.citizenshipReq);
  if (data.levels) extraTags.push(data.levels);

  await prisma.opportunity.create({
    data: {
      title: data.title,
      institution: data.institution,
      summary: data.summary,
      category: "Off-campus summer research program",
      deadline: data.deadline ? new Date(data.deadline) : null,
      applicationUrl: data.applicationUrl ?? null,
      contactEmail: data.contactEmail ?? null,
      tags: [...data.tags, ...extraTags].filter(Boolean),
      source,
      sourceId,
      sourceUrl: sourceUrl ?? null,
      status: "active",
    },
  });

  return "added";
}