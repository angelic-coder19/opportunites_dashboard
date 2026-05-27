// src/lib/scraper/reufinder.ts
// Fetches recent REUFinder blog posts via the WordPress REST API,
// sends each post's content to Gemini, and inserts extracted programs.

import * as cheerio from "cheerio";
import {
  getSource,
  startRun,
  finishRun,
  insertOpportunity,
  updateContentHash,
  hashContent,
} from "./index";
import { extractOpportunitiesFromText } from "./gemini-extract";
import { prisma } from "@/lib/prisma";

interface WPPost {
  id: number;
  date: string;
  modified: string;
  link: string;
  content: { rendered: string };
}

/**
 * Strips HTML tags and normalises whitespace for Gemini, but PRESERVES the
 * href of each <a> tag inline as "anchor text <https://url>". Plain .text()
 * would drop the hrefs and Gemini would return null for applicationUrl.
 */
function htmlToPlainText(html: string): string {
  const $ = cheerio.load(html);
  // Remove social sharing widgets, like buttons, etc.
  $(".sharedaddy, .sd-block, .wordads-tag, .jetpack-likes-widget-wrapper").remove();
  // Inline each link's href next to its visible text so Gemini can see it.
  // We use parentheses around the URL because cheerio's replaceWith parses
  // its argument as HTML — angle brackets get eaten as malformed tags.
  $("a[href]").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href")?.trim();
    const text = $a.text();
    if (href && /^https?:\/\//i.test(href)) {
      $a.replaceWith(`${text} (${href})`);
    }
  });
  return $.text().replace(/\s+/g, " ").trim();
}

export async function runReufinderScraper(): Promise<{
  added: number;
  skipped: number;
  tokens: number;
  postsProcessed: number;
}> {
  const source = await getSource("reufinder");
  const run = await startRun(source.id);

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalTokens = 0;
  let postsProcessed = 0;

  try {
    // Fetch the 10 most recent posts from the WordPress REST API
    const res = await fetch(source.url, {
      headers: { "User-Agent": "UAPB-RIED-Dashboard/1.0" },
      next: { revalidate: 0 }, // never cache in Next.js fetch
    });

    if (!res.ok) {
      throw new Error(`REUFinder API returned ${res.status}`);
    }

    const posts: WPPost[] = await res.json();

    for (const post of posts) {
      // Only process posts modified since our last successful run
      const postModified = new Date(post.modified);
      if (
        source.lastChangedAt &&
        postModified <= new Date(source.lastChangedAt)
      ) {
        continue;
      }

      const plainText = htmlToPlainText(post.content.rendered);
      if (plainText.length < 200) continue; // skip empty or boilerplate posts

      postsProcessed++;

      const { programs, tokensUsed } = await extractOpportunitiesFromText(
        plainText,
        post.link
      );
      totalTokens += tokensUsed;

      for (const program of programs) {
        // Use REUFinder post ID + title slug as the dedup key
        const sourceId = `${post.id}:${program.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .slice(0, 60)}`;

        const result = await insertOpportunity(
          program,
          "scrape_reufinder",
          sourceId,
          post.link
        );

        if (result === "added") totalAdded++;
        else totalSkipped++;
      }
    }

    // Mark content as changed only if we actually processed new posts
    if (postsProcessed > 0) {
      await updateContentHash(source.id, hashContent(JSON.stringify(posts)));
    } else {
      await prisma.scrapeSource.update({
        where: { id: source.id },
        data: { lastCheckedAt: new Date() },
      });
    }

    await finishRun(run.id, "success", {
      found: totalAdded + totalSkipped,
      added: totalAdded,
      skipped: totalSkipped,
      tokens: totalTokens,
    }, postsProcessed > 0);

    return { added: totalAdded, skipped: totalSkipped, tokens: totalTokens, postsProcessed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(run.id, "failed", {
      found: 0,
      added: totalAdded,
      skipped: totalSkipped,
      tokens: totalTokens,
      error: message,
    }, false);
    throw error;
  }
}