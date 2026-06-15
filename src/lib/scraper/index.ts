// src/lib/scraper/index.ts
// Shared utilities used by all scrapers.

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { ScrapeSource, ScrapeRun } from "@/generated/prisma";
import { ensureScrapeSource } from "./scrape-sources";

function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}

export function hashContent(html: string): string {
  return crypto.createHash("sha256").update(html).digest("hex");
}

/** Returns the ScrapeSource row for a given key, auto-creating known sources if missing. */
export async function getSource(sourceKey: string): Promise<ScrapeSource> {
  let source = await prisma.scrapeSource.findUnique({
    where: { sourceKey },
  });

  if (!source) {
    await ensureScrapeSource(sourceKey);
    source = await prisma.scrapeSource.findUnique({
      where: { sourceKey },
    });
  }

  if (!source) throw new Error(`Scrape source not found: ${sourceKey}`);
  if (!source.isActive) throw new Error(`Scrape source is disabled: ${sourceKey}`);
  return source;
}

/**
 * Thrown when a scrape run is already in progress for the same source.
 * Callers (admin routes) should catch this and return HTTP 409.
 */
export class ConcurrentRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrentRunError";
  }
}

// Runs stuck in "running" for longer than this are considered stale/crashed.
const STALE_RUN_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a scrape_runs row and returns it.
 * Throws ConcurrentRunError if another run is already in progress.
 * Automatically kills stale runs (> 10 min old) so crashes don't lock the source forever.
 */
export async function startRun(sourceId: string): Promise<ScrapeRun> {
  const runningRun = await prisma.scrapeRun.findFirst({
    where: { sourceId, status: "running" },
    orderBy: { startedAt: "desc" },
  });

  if (runningRun) {
    const age = Date.now() - runningRun.startedAt.getTime();
    if (age < STALE_RUN_MS) {
      const minutesLeft = Math.ceil((STALE_RUN_MS - age) / 60_000);
      throw new ConcurrentRunError(
        `A sync is already in progress for this source. Try again in ~${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`
      );
    }
    // Stale run — mark as failed so it no longer blocks
    await prisma.scrapeRun.update({
      where: { id: runningRun.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: "Timed out — killed by a newer run",
      },
    });
  }

  return prisma.scrapeRun.create({
    data: { sourceId, status: "running" },
  });
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
 * Returns 'added' or 'skipped' (already exists — same source/sourceId pair or same URL from any source).
 *
 * Race-safe: uses try/catch on the DB unique constraint (P2002) instead of
 * a read-then-write check, so concurrent runs can't both "see null" and both insert.
 *
 * Cross-source dedup: if the same applicationUrl is already stored under a
 * different source, we skip rather than create a visible duplicate for users.
 */
export async function insertOpportunity(
  data: ExtractedOpportunity,
  source: string,
  sourceId: string,
  sourceUrl?: string
): Promise<"added" | "updated" | "skipped"> {
  // Required fields guard
  if (!data.title?.trim() || !data.institution?.trim()) {
    console.warn(
      `[scraper] Skipping ${source}/${sourceId}: missing required field (title="${data.title}", institution="${data.institution}")`
    );
    return "skipped";
  }

  if (data.deadline) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const deadline = new Date(data.deadline);
    if (!Number.isNaN(deadline.getTime()) && deadline < today) {
      console.log(
        `[scraper] Skipping ${source}/${sourceId}: deadline already passed (${data.deadline})`
      );
      return "skipped";
    }
  }

  // ── Cross-source URL dedup ───────────────────────────────────────────────
  if (data.applicationUrl) {
    const byUrl = await prisma.opportunity.findFirst({
      where: {
        applicationUrl: data.applicationUrl,
        NOT: { source },
      },
      select: { id: true, source: true, sourceId: true },
    });
    if (byUrl) {
      console.log(
        `[scraper] Cross-source dup skipped: ${source}/${sourceId} matches ${byUrl.source}/${byUrl.sourceId} via URL`
      );
      return "skipped";
    }
  }

  const existing = await prisma.opportunity.findUnique({
    where: { source_sourceId: { source, sourceId } },
  });

  if (existing) {
    const updates: {
      deadline?: Date;
      summary?: string;
      applicationUrl?: string | null;
      tags?: string[];
    } = {};

    if (data.deadline) {
      const existingDate = existing.deadline?.toISOString().slice(0, 10) ?? null;
      if (existingDate !== data.deadline) {
        updates.deadline = new Date(data.deadline);
      }
    }

    if (
      data.summary &&
      data.summary.length > (existing.summary?.length ?? 0) &&
      (existing.summary?.length ?? 0) < 120
    ) {
      updates.summary = data.summary;
    }

    if (data.applicationUrl && !existing.applicationUrl) {
      updates.applicationUrl = data.applicationUrl;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.opportunity.update({
        where: { id: existing.id },
        data: updates,
      });
      return "updated";
    }

    return "skipped";
  }

  // ── Insert (race-safe) ───────────────────────────────────────────────────
  const extraTags: string[] = [];
  if (data.citizenshipReq) extraTags.push(data.citizenshipReq);
  if (data.levels) extraTags.push(data.levels);

  try {
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
  } catch (err) {
    if (isUniqueConstraintViolation(err)) return "skipped";
    throw err;
  }
}
