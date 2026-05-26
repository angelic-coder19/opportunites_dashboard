// src/lib/scraper/pathways.ts
// Two-phase Pathways scraper:
//   1. Listing pass — grab all programs from the master list (cheap, no detail fetches).
//      Gives us: sourceId, title hint, deadline (if shown on the listing), detail URL.
//   2. Enrichment pass — for each program NOT already in our DB, fetch its detail page
//      and extract the real apply URL, institution, description, levels, and tags.
//      Programs without an external apply link are SKIPPED (no row inserted).
//
// The enrichment pass is rate-limited (500ms between fetches) and capped per run
// so cron runs don't blow past Vercel's timeout. The recurring monthly cron uses
// the default cap; a one-off backfill can pass a higher cap via ?cap=.

import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import {
  getSource,
  startRun,
  finishRun,
  hasContentChanged,
  updateContentHash,
  recordNoChange,
  hashContent,
  insertOpportunity,
  type ExtractedOpportunity,
} from "./index";

const DETAIL_BASE = "https://pathwaystoscience.org/";
const DEFAULT_ENRICH_CAP = 50;
const ENRICH_DELAY_MS = 500;

interface ListingEntry {
  sourceId: string;
  detailUrl: string;
  /** Deadline shown on the listing row, if any. The detail page rarely repeats it. */
  deadline: string | null;
  /** Funding sponsor tags inferred from sponsor icons on the listing row. */
  fundingTags: string[];
  /** Institution name from the grey-background header row above this program.
   *  Used as a fallback when the detail page lists multiple participating
   *  institutions with no single "(Lead)". */
  listingInstitution: string | null;
}

function parseDeadline(text: string): string | null {
  const match = text.match(/Application Deadline:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function fundingTags(imgAlts: string[]): string[] {
  const tagMap: Record<string, string> = {
    "funded by NSF": "NSF",
    "funded by NIH": "NIH",
    "funded by DOE": "DOE",
    "funded by DOD": "DOD",
    "funded by USDA": "USDA",
    "funds international students": "International Students Eligible",
    "study abroad program": "Study Abroad",
  };
  return imgAlts.flatMap((alt) => (tagMap[alt] ? [tagMap[alt]] : []));
}

function parseListing(html: string): ListingEntry[] {
  const $ = cheerio.load(html);
  const entries: ListingEntry[] = [];
  let currentInstitution: string | null = null;

  for (const el of $("div.progigert").toArray()) {
    const $el = $(el);
    const style = $el.attr("style") ?? "";
    // Institution-header rows have a grey background.
    if (style.includes("#dedede")) {
      currentInstitution = $el.find("h2").text().trim() || null;
      continue;
    }
    if (!style.includes("#efefef")) continue;

    const titleEl = $el.find("a[href^='programhub.aspx']").first();
    const href = titleEl.attr("href") ?? "";
    const sourceId = href.match(/sort=([^&]+)/)?.[1];
    if (!sourceId) continue;

    const imgAlts = $el
      .find("img")
      .toArray()
      .map((img) => $(img).attr("alt") ?? "")
      .filter(Boolean);

    entries.push({
      sourceId,
      detailUrl: `${DETAIL_BASE}${href}`,
      deadline: parseDeadline($el.find("i").text()),
      fundingTags: fundingTags(imgAlts),
      listingInstitution: currentInstitution,
    });
  }
  return entries;
}

/**
 * The detail page renders everything inside `.col-sm-7` as a flat sequence of
 * `<b>Label:</b><br> value <br><br>` chunks. Walk the inner HTML and split on
 * the bold labels to pull out each labeled field.
 */
function parseLabeledFields(mainHtml: string): Record<string, string> {
  // Capture: <b>Label:</b> followed by everything until the next <b> or end.
  const out: Record<string, string> = {};
  const re = /<b>([^<]+?):<\/b>([\s\S]*?)(?=<b>[^<]+?:<\/b>|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(mainHtml)) !== null) {
    const label = match[1].trim();
    const valueHtml = match[2];
    // Strip tags, collapse whitespace.
    const text = cheerio
      .load(`<div>${valueHtml}</div>`)("div")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    out[label] = text;
  }
  return out;
}

/** Decodes HTML entities via cheerio's text extraction. */
function decodeEntities(s: string): string {
  return cheerio.load(`<div>${s}</div>`)("div").text();
}

/**
 * Extract the discipline + keyword tags from the detail page.
 * The HTML pattern is:
 *   <b><span ...>Academic Disciplines:</span> </b><span ...><br>Tag1<br>Tag2<br>...</span>
 * We regex out each labeled block, then split its inner HTML on <br>.
 */
function parseTagsFromDetail(mainHtml: string): string[] {
  const tags = new Set<string>();
  const labels = ["Academic Disciplines", "Keywords"];
  for (const label of labels) {
    const re = new RegExp(
      `<b>\\s*<span[^>]*>${label}:</span>\\s*</b>\\s*<span[^>]*>([\\s\\S]*?)</span>`,
      "i"
    );
    const match = mainHtml.match(re);
    if (!match) continue;
    match[1]
      .split(/<br\s*\/?>/i)
      .map((t) => decodeEntities(t.replace(/<[^>]+>/g, "")).trim())
      .filter(Boolean)
      .forEach((t) => tags.add(t));
  }
  return Array.from(tags);
}

/**
 * Extract the Academic Level entries as a clean string array.
 * The HTML format is:
 *   <b>Academic Level:</b><br> <i>For most...details.</i><br><br>Undergraduates - First Year <br>Undergraduates - Sophomore <br>...
 * We split the raw HTML chunk on <br> instead of using cheerio's .text()
 * (which would collapse the bullets into one run-on string).
 */
function parseLevels(mainHtml: string): string[] {
  const match = mainHtml.match(/<b>Academic Level:<\/b>([\s\S]*?)(?=<b>[^<]*?:<\/b>)/i);
  if (!match) return [];
  return match[1]
    .split(/<br\s*\/?>/i)
    .map((chunk) => decodeEntities(chunk.replace(/<[^>]+>/g, "")).trim())
    .filter(
      (s) =>
        s &&
        // Drop the boilerplate intro and any free-form "Note:" guidance lines.
        !/^For most summer research programs/i.test(s) &&
        !/^Note:/i.test(s)
    );
}

interface DetailFields {
  title: string | null;
  institution: string | null;
  summary: string | null;
  applicationUrl: string | null;
  /** Array of distinct level strings (e.g. ["Undergraduates - Junior", "Undergraduates - Senior"]). */
  levels: string[];
  tags: string[];
}

export function parseDetailPage(html: string): DetailFields {
  const $ = cheerio.load(html);
  const $main = $(".col-sm-7").first();

  const title = $main.find("h1").first().text().trim() || null;

  // Apply link: prefer the explicit "Learn More and Apply!" button. Fall back to
  // any external (target=_blank) link inside the main column whose href is NOT
  // on pathwaystoscience.org and is not the program video.
  let applyUrl: string | null =
    $main.find("a.btn-success[target='_blank']").attr("href") ?? null;
  if (!applyUrl) {
    const candidate = $main
      .find("a[target='_blank']")
      .toArray()
      .map((a) => $(a).attr("href") ?? "")
      .find(
        (h) =>
          h.startsWith("http") &&
          !/pathwaystoscience\.org/i.test(h) &&
          !/video|youtube|vimeo/i.test(h)
      );
    applyUrl = candidate ?? null;
  }

  const mainHtml = $main.html() ?? "";
  const fields = parseLabeledFields(mainHtml);

  const summary = fields["Description"]?.slice(0, 800) || null;
  const levels = parseLevels(mainHtml);

  // Institution = the program with "(Lead)" annotation in "Participating Institution(s)".
  // The labeled-field text strips formatting, so we look for "<institution> (Lead)".
  const participating = fields["Participating Institution(s)"] ?? "";
  const leadMatch = participating.match(/\(Click an institution.*?\)\s*([^()]+?)\s*\(Lead\)/);
  const institution = leadMatch?.[1].trim() || null;

  const tagsFromHtml = parseTagsFromDetail(mainHtml);

  return { title, institution, summary, applicationUrl: applyUrl, levels, tags: tagsFromHtml };
}

async function fetchDetail(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "UAPB-RIED-Dashboard/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Pathways detail ${url} returned ${res.status}`);
  return res.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runPathwaysScraper(opts?: { enrichCap?: number }): Promise<{
  added: number;
  skipped: number;
  enriched: number;
  noApplyLink: number;
  changed: boolean;
}> {
  const enrichCap = opts?.enrichCap ?? DEFAULT_ENRICH_CAP;
  const source = await getSource("pathways");
  const run = await startRun(source.id);

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalEnriched = 0;
  let totalNoApply = 0;

  try {
    // ── 1. Fetch listing
    const res = await fetch(source.url, {
      headers: { "User-Agent": "UAPB-RIED-Dashboard/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Pathways listing returned ${res.status}`);
    const listingHtml = await res.text();

    const newHash = hashContent(listingHtml);
    const changed = await hasContentChanged(source.id, newHash);
    if (!changed) {
      await recordNoChange(source.id);
      await finishRun(
        run.id,
        "skipped",
        { found: 0, added: 0, skipped: 0 },
        false
      );
      return { added: 0, skipped: 0, enriched: 0, noApplyLink: 0, changed: false };
    }

    const entries = parseListing(listingHtml);

    // ── 2. Filter to programs we haven't already stored
    const existing = await prisma.opportunity.findMany({
      where: {
        source: "scrape_pathways",
        sourceId: { in: entries.map((e) => e.sourceId) },
      },
      select: { sourceId: true },
    });
    const existingIds = new Set(existing.map((r) => r.sourceId));
    const toEnrich = entries.filter((e) => !existingIds.has(e.sourceId));

    // ── 3. Enrich up to enrichCap new programs this run
    const batch = toEnrich.slice(0, enrichCap);
    for (const entry of batch) {
      totalEnriched++;
      try {
        const detailHtml = await fetchDetail(entry.detailUrl);
        const detail = parseDetailPage(detailHtml);

        if (!detail.applicationUrl) {
          totalNoApply++;
          totalSkipped++;
          await sleep(ENRICH_DELAY_MS);
          continue;
        }

        // Resolve institution: prefer the detail page's "(Lead)", fall back to
        // the listing's grey-header institution (multi-institution programs).
        const institution =
          detail.institution ?? entry.listingInstitution ?? "Multiple Institutions";

        // Build the tags array ourselves and pass levels/citizenshipReq as null,
        // since insertOpportunity would otherwise dump the entire levels string
        // in as a single ugly tag.
        // Order matters: funding sponsors and eligibility (levels) go first so
        // they're never truncated by the cap, even when a program has many
        // discipline/keyword tags.
        const combinedTags = [
          ...entry.fundingTags,
          ...detail.levels,
          ...detail.tags,
        ].slice(0, 15);

        const program: ExtractedOpportunity = {
          title: detail.title ?? "Unknown Program",
          institution,
          summary:
            detail.summary ?? `Research opportunity at ${institution}.`,
          deadline: entry.deadline,
          applicationUrl: detail.applicationUrl,
          contactEmail: null,
          citizenshipReq: null,
          levels: null,
          tags: combinedTags,
        };

        const result = await insertOpportunity(
          program,
          "scrape_pathways",
          entry.sourceId,
          entry.detailUrl
        );
        if (result === "added") totalAdded++;
        else totalSkipped++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[scraper] Pathways detail failed for ${entry.sourceId}: ${msg}`);
        totalSkipped++;
      }
      await sleep(ENRICH_DELAY_MS);
    }

    // Only mark hash as updated when we've enriched everything; otherwise leave
    // the old hash so subsequent runs keep working through the backlog.
    if (toEnrich.length <= enrichCap) {
      await updateContentHash(source.id, newHash);
    } else {
      await prisma.scrapeSource.update({
        where: { id: source.id },
        data: { lastCheckedAt: new Date() },
      });
    }

    await finishRun(
      run.id,
      "success",
      { found: entries.length, added: totalAdded, skipped: totalSkipped },
      true
    );

    return {
      added: totalAdded,
      skipped: totalSkipped,
      enriched: totalEnriched,
      noApplyLink: totalNoApply,
      changed: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(
      run.id,
      "failed",
      { found: 0, added: totalAdded, skipped: totalSkipped, error: message },
      false
    );
    throw error;
  }
}
