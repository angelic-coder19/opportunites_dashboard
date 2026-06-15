// Default scrape source rows — used by seed and auto-created on first sync.

import { prisma } from "@/lib/prisma";

export interface ScrapeSourceDef {
  label: string;
  sourceKey: string;
  url: string;
  parserType: "cheerio" | "api";
  checkFrequency: "daily" | "weekly" | "monthly";
  notes: string;
}

export const SCRAPE_SOURCE_DEFAULTS: Record<string, ScrapeSourceDef> = {
  reufinder: {
    label: "REUFinder.com",
    sourceKey: "reufinder",
    url: "https://reufinder.com/wp-json/wp/v2/posts?per_page=10&_fields=id,date,modified,slug,link,content&orderby=date&order=desc",
    parserType: "cheerio",
    checkFrequency: "weekly",
    notes:
      "WordPress REST API — returns recent posts as JSON. Content is HTML; parsed with cheerio then sent to Gemini for extraction.",
  },
  pathways: {
    label: "Pathways to Science",
    sourceKey: "pathways",
    url: "https://pathwaystoscience.org/programs.aspx?dd=SummerResearch_Summer+Research+Opportunity&submit=y&dhub=SummerResearch_Summer+Research+Opportunity&all=all",
    parserType: "cheerio",
    checkFrequency: "monthly",
    notes:
      "Single-page listing of 624+ summer research programs. Hash-gated — only parses when content changes.",
  },
  colorstack: {
    label: "ColorStack",
    sourceKey: "colorstack",
    url: "https://app.colorstack.io/opportunities.data",
    parserType: "api",
    checkFrequency: "daily",
    notes:
      "ColorStack member opportunities feed. Requires OTP session via Admin → Scrapers.",
  },
  workday: {
    label: "Workday Talent Marketplace",
    sourceKey: "workday",
    url: "https://wd5.myworkday.com/uasys/internalapi/ccx/internalapi/talentMarketplace/v1/uasys/searchJobs",
    parserType: "api",
    checkFrequency: "daily",
    notes:
      "UA System Workday internal API. Only UAPB jobs imported. Connect via Admin → Scrapers.",
  },
};

export async function ensureScrapeSource(sourceKey: string): Promise<void> {
  const def = SCRAPE_SOURCE_DEFAULTS[sourceKey];
  if (!def) return;

  await prisma.scrapeSource.upsert({
    where: { sourceKey },
    update: {},
    create: def,
  });
}

export async function ensureAllScrapeSources(): Promise<void> {
  for (const sourceKey of Object.keys(SCRAPE_SOURCE_DEFAULTS)) {
    await ensureScrapeSource(sourceKey);
  }
}
