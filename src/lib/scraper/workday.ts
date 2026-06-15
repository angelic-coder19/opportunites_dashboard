// src/lib/scraper/workday.ts
// Syncs the Workday Talent Marketplace (wd5.myworkday.com/uasys) into the DB.
//
// Connection options (Admin → Scrapers):
// 1. Browser bridge (recommended) — run a script on wd5.myworkday.com while logged in
// 2. Paste cURL — copy searchJobs as cURL from DevTools (includes all headers)
// 3. Token only — often fails server-side; Workday may require browser context

import * as cheerio from "cheerio";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSource, startRun, finishRun, insertOpportunity } from "./index";
import {
  extractDeadlineFromText,
  parseFlexibleDate,
} from "./date-utils";

const BASE_URL = "https://wd5.myworkday.com";
const TENANT = "uasys";
const SEARCH_URL = `${BASE_URL}/${TENANT}/internalapi/ccx/internalapi/talentMarketplace/v1/${TENANT}/searchJobs`;
const JOBS_HUB_REFERER = `${BASE_URL}/${TENANT}/d/task/2998$42366.htmld`;
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PAGE_LIMIT = 50;
const MAX_PAGES = 20;
const BRIDGE_CODE_TTL_MS = 10 * 60 * 1000;

const KEY_SESSION = "workday_session";
const KEY_TOKEN_LEGACY = "workday_token";
const KEY_CONNECTED_VIA = "workday_connected_via";
const KEY_BRIDGE_CODE = "workday_bridge_code";

export type WorkdayConnectMode = "curl" | "token" | "bridge";

export interface WorkdaySession {
  token: string;
  cookie?: string;
  referer?: string;
  userAgent?: string;
  workdayClient?: string;
  headers?: Record<string, string>;
}

const UAPB_SIGNALS = [
  "pine bluff",
  "uapb",
  "university of arkansas at pine bluff",
  "ua pine bluff",
];

const RESEARCH_TITLE_SIGNALS = [
  "research",
  "reu",
  "lab assistant",
  "laboratory",
  "graduate assistant",
  "postdoc",
  "scholar",
  "fellowship",
  "stem",
];

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

async function deleteSettings(keys: string[]): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key: { in: keys } } });
}

export async function getWorkdayConnectMode(): Promise<WorkdayConnectMode | null> {
  const mode = await getSetting(KEY_CONNECTED_VIA);
  if (mode === "curl" || mode === "token" || mode === "bridge") return mode;
  return null;
}

export async function getWorkdaySession(): Promise<WorkdaySession | null> {
  const raw = await getSetting(KEY_SESSION);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as WorkdaySession;
      if (parsed.token?.trim()) return { ...parsed, token: parsed.token.trim() };
    } catch {
      // fall through to legacy token
    }
  }

  const legacy = (await getSetting(KEY_TOKEN_LEGACY))?.trim();
  if (legacy) return { token: legacy };
  return null;
}

export async function getWorkdayToken(): Promise<string | null> {
  return (await getWorkdaySession())?.token ?? null;
}

export async function setWorkdaySession(
  session: WorkdaySession,
  mode: WorkdayConnectMode
): Promise<void> {
  await setSetting(KEY_SESSION, JSON.stringify(session));
  await setSetting(KEY_CONNECTED_VIA, mode);
  await deleteSettings([KEY_TOKEN_LEGACY]);
}

export async function setWorkdayToken(token: string): Promise<void> {
  await setWorkdaySession({ token: token.trim() }, "token");
}

export async function markWorkdayBridgeConnected(): Promise<void> {
  await setSetting(KEY_CONNECTED_VIA, "bridge");
  await deleteSettings([KEY_SESSION, KEY_TOKEN_LEGACY]);
}

export async function clearWorkdayToken(): Promise<void> {
  await deleteSettings([KEY_SESSION, KEY_TOKEN_LEGACY, KEY_CONNECTED_VIA, KEY_BRIDGE_CODE]);
}

export async function isWorkdayConnected(): Promise<boolean> {
  const mode = await getWorkdayConnectMode();
  if (mode === "bridge") return true;
  return !!(await getWorkdaySession());
}

interface BridgeCodeRecord {
  code: string;
  expiresAt: number;
}

export async function createWorkdayBridgeCode(): Promise<{ code: string; expiresAt: string }> {
  const code = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + BRIDGE_CODE_TTL_MS;
  const record: BridgeCodeRecord = { code, expiresAt };
  await setSetting(KEY_BRIDGE_CODE, JSON.stringify(record));
  return { code, expiresAt: new Date(expiresAt).toISOString() };
}

export async function consumeWorkdayBridgeCode(provided: string): Promise<boolean> {
  const raw = await getSetting(KEY_BRIDGE_CODE);
  if (!raw) return false;

  let record: BridgeCodeRecord;
  try {
    record = JSON.parse(raw) as BridgeCodeRecord;
  } catch {
    return false;
  }

  if (Date.now() > record.expiresAt) {
    await deleteSettings([KEY_BRIDGE_CODE]);
    return false;
  }

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(record.code, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  await deleteSettings([KEY_BRIDGE_CODE]);
  return true;
}

function buildFetchHeaders(session: WorkdaySession): Record<string, string> {
  const fromCurl = session.headers ?? {};
  const headers: Record<string, string> = {
    Accept: fromCurl.accept ?? "*/*",
    "Content-Type": fromCurl["content-type"] ?? "application/json",
    "session-secure-token": session.token,
    Referer: session.referer ?? fromCurl.referer ?? JOBS_HUB_REFERER,
    Origin: fromCurl.origin ?? BASE_URL,
    "User-Agent": session.userAgent ?? fromCurl["user-agent"] ?? DEFAULT_UA,
  };

  if (session.workdayClient ?? fromCurl["x-workday-client"]) {
    headers["x-workday-client"] = session.workdayClient ?? fromCurl["x-workday-client"]!;
  }

  for (const [key, value] of Object.entries(fromCurl)) {
    if (key === "cookie" || key === "host" || key.startsWith(":")) continue;
    if (headers[key] === undefined) headers[key] = value;
  }

  if (session.cookie) headers.Cookie = session.cookie;

  return headers;
}

interface WorkdayLocation {
  city?: string;
  state?: string;
  name?: string;
  descriptor?: string;
}

interface WorkdayOrg {
  name?: string;
  descriptor?: string;
}

export interface WorkdayJob {
  id?: string;
  jobRequisitionId?: string;
  referenceID?: string;
  title?: string;
  jobTitle?: string;
  postedDate?: string;
  postDate?: string;
  closingDate?: string;
  applicationDeadline?: string;
  primaryLocation?: WorkdayLocation;
  jobPrimaryLocation?: WorkdayLocation;
  jobAdditionalLocations?: WorkdayLocation[];
  businessSite?: { name?: string };
  workerSubType?: { descriptor?: string };
  supervisoryOrganization?: WorkdayOrg;
  organization?: WorkdayOrg;
  jobDescriptionFormatted?: string;
  jobDescription?: string;
  internalJobPosting?: { jobPostingUrl?: string };
  jobPosting?: { instanceId?: string };
  externalJobPostingUrl?: string;
  applyUrl?: string;
  jobType?: { name?: string; descriptor?: string };
  employmentType?: { descriptor?: string };
  jobTimeType?: { descriptor?: string };
  category?: { name?: string };
  categories?: Array<{ name?: string }>;
  jobFamilies?: Array<{ descriptor?: string; name?: string }>;
}

interface WorkdaySearchResponse {
  total?: number;
  data?: unknown[];
  jobs?: WorkdayJob[];
  jobPostings?: WorkdayJob[];
  results?: WorkdayJob[];
}

// ─── Scrape source bootstrap ──────────────────────────────────────────────────
// Handled centrally in getSource() via scrape-sources.ts

class AuthError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "AuthError";
  }
}

const EXPIRED_TOKEN_MSG =
  "Workday session expired. Use Browser connect or paste a fresh cURL from DevTools (searchJobs → Copy as cURL).";

async function readWorkdayJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (contentType.includes("text/html") || text.trimStart().startsWith("<")) {
    if (text.includes("login.htmld") || text.includes("redirectUrl")) {
      throw new AuthError(EXPIRED_TOKEN_MSG);
    }
    throw new AuthError(
      "Workday returned HTML instead of JSON — try Browser connect or paste a full cURL."
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AuthError("Workday returned an unexpected response — try a fresh cURL or Browser connect.");
  }
}

export function normalizeWorkdayJob(raw: unknown): WorkdayJob | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const job = (item.jobPostingAnchor ?? item) as WorkdayJob;
  if (!job || typeof job !== "object") return null;

  const primary = job.jobPrimaryLocation ?? job.primaryLocation;
  return {
    ...job,
    title: job.jobTitle ?? job.title,
    jobTitle: job.jobTitle ?? job.title,
    primaryLocation: primary,
    jobPrimaryLocation: primary,
    postedDate: job.postDate ?? job.postedDate,
  };
}

function extractJobs(body: WorkdaySearchResponse): WorkdayJob[] {
  const rawItems = body.data ?? body.jobs ?? body.jobPostings ?? body.results ?? [];
  return rawItems
    .map((item) => normalizeWorkdayJob(item))
    .filter((job): job is WorkdayJob => job !== null);
}

async function fetchJobPage(
  session: WorkdaySession,
  offset: number
): Promise<{ jobs: WorkdayJob[]; total: number }> {
  const url = `${SEARCH_URL}?offset=${offset}&limit=${PAGE_LIMIT}`;
  const res = await fetch(url, {
    headers: buildFetchHeaders(session),
    next: { revalidate: 0 },
  });

  if (res.status === 401 || res.status === 403) {
    throw new AuthError(EXPIRED_TOKEN_MSG);
  }
  if (!res.ok) {
    throw new Error(`Workday API returned ${res.status}`);
  }

  const body = await readWorkdayJson<WorkdaySearchResponse>(res);
  const jobs = extractJobs(body);
  const total = body.total ?? jobs.length;
  return { jobs, total };
}

function isUapbJob(job: WorkdayJob): boolean {
  const locations = [
    job.primaryLocation?.city ?? "",
    job.primaryLocation?.state ?? "",
    job.primaryLocation?.name ?? "",
    job.primaryLocation?.descriptor ?? "",
    job.jobPrimaryLocation?.descriptor ?? "",
    job.jobPrimaryLocation?.name ?? "",
    ...(job.jobAdditionalLocations ?? []).flatMap((loc) => [
      loc.descriptor ?? "",
      loc.name ?? "",
      loc.city ?? "",
    ]),
  ];

  const haystack = [
    ...locations,
    job.workerSubType?.descriptor ?? "",
    job.businessSite?.name ?? "",
    job.referenceID ?? "",
    ...(job.supervisoryOrganization?.name ? [job.supervisoryOrganization.name] : []),
    ...(job.organization?.name ? [job.organization.name] : []),
    ...(job.jobFamilies ?? []).map((f) => f.descriptor ?? f.name ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  return UAPB_SIGNALS.some((s) => haystack.includes(s));
}

function inferCategory(title: string): "On-campus job" | "Off-campus summer research program" {
  const lower = title.toLowerCase();
  if (RESEARCH_TITLE_SIGNALS.some((s) => lower.includes(s))) {
    return "Off-campus summer research program";
  }
  return "On-campus job";
}

function htmlToText(html: string): string {
  return cheerio
    .load(`<div>${html}</div>`)("div")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}

function extractWorkdayDeadline(job: WorkdayJob): string | null {
  const structured = job.closingDate ?? job.applicationDeadline;
  if (structured) {
    const parsed = parseFlexibleDate(structured);
    if (parsed) return parsed;
  }

  const sources = [job.jobDescription ?? "", job.jobDescriptionFormatted ?? ""];
  for (const source of sources) {
    const fromText = extractDeadlineFromText(source);
    if (fromText) return fromText;
  }

  return null;
}

function jobToOpportunity(job: WorkdayJob): {
  sourceId: string;
  title: string;
  summary: string;
  deadline: string | null;
  applicationUrl: string;
  tags: string[];
  category: "On-campus job" | "Off-campus summer research program";
} | null {
  const title = (job.title ?? job.jobTitle ?? "").trim();
  if (!title) return null;

  const sourceId = job.referenceID ?? job.jobRequisitionId ?? job.id ?? "";
  if (!sourceId) return null;

  const rawHtml = job.jobDescriptionFormatted ?? job.jobDescription ?? "";
  const summary = rawHtml ? htmlToText(rawHtml) : `${title} at UAPB.`;

  const deadline = extractWorkdayDeadline(job);

  const applicationUrl =
    job.internalJobPosting?.jobPostingUrl ??
    job.externalJobPostingUrl ??
    job.applyUrl ??
    `${BASE_URL}/${TENANT}/d/home.htmld`;

  const tagSources: Array<string | undefined> = [
    job.jobType?.name,
    job.jobType?.descriptor,
    job.employmentType?.descriptor,
    job.jobTimeType?.descriptor,
    job.workerSubType?.descriptor,
    job.category?.name,
    ...(job.categories ?? []).map((c) => c.name),
    ...(job.jobFamilies ?? []).map((f) => f.descriptor ?? f.name),
    "UAPB",
    "Workday",
  ];
  const tags = tagSources
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .map((t) => t.trim())
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 10);

  return { sourceId, title, summary, deadline, applicationUrl, tags, category: inferCategory(title) };
}

async function persistWorkdayJob(
  job: WorkdayJob
): Promise<"added" | "updated" | "skipped"> {
  const mapped = jobToOpportunity(job);
  if (!mapped) return "skipped";

  const result = await insertOpportunity(
    {
      title: mapped.title,
      institution: "University of Arkansas at Pine Bluff",
      summary: mapped.summary,
      deadline: mapped.deadline,
      applicationUrl: mapped.applicationUrl,
      contactEmail: null,
      citizenshipReq: null,
      levels: null,
      tags: mapped.tags,
    },
    "scrape_workday",
    mapped.sourceId,
    mapped.applicationUrl
  );

  if (result === "added" || result === "updated") {
    const row = await prisma.opportunity.findUnique({
      where: { source_sourceId: { source: "scrape_workday", sourceId: mapped.sourceId } },
      select: { id: true, category: true },
    });
    if (row && row.category !== mapped.category) {
      await prisma.opportunity.update({
        where: { id: row.id },
        data: { category: mapped.category },
      });
    }
    return result;
  }

  return "skipped";
}

async function processWorkdayJobs(jobs: WorkdayJob[]): Promise<{
  added: number;
  updated: number;
  skipped: number;
  filtered: number;
}> {
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let filtered = 0;

  for (const job of jobs) {
    if (!isUapbJob(job)) {
      filtered++;
      continue;
    }
    const result = await persistWorkdayJob(job);
    if (result === "added") added++;
    else if (result === "updated") updated++;
    else skipped++;
  }

  return { added, updated, skipped, filtered };
}

export async function validateWorkdaySession(
  sessionInput?: WorkdaySession | string | null
): Promise<{ valid: boolean; reason?: string }> {
  let session: WorkdaySession | null = null;
  if (typeof sessionInput === "string") {
    session = { token: sessionInput.trim() };
  } else if (sessionInput) {
    session = sessionInput;
  } else {
    session = await getWorkdaySession();
  }

  if (!session?.token?.trim()) {
    return { valid: false, reason: "No Workday session stored." };
  }

  try {
    const { total } = await fetchJobPage(session, 0);
    if (typeof total !== "number") {
      return { valid: false, reason: "Unexpected response format from Workday." };
    }
    return { valid: true };
  } catch (err) {
    if (err instanceof AuthError) return { valid: false, reason: err.message };
    return { valid: false, reason: String(err) };
  }
}

export async function importWorkdayJobs(rawJobs: unknown[]): Promise<{
  added: number;
  skipped: number;
  filtered: number;
}> {
  const jobs = rawJobs
    .map((raw) => normalizeWorkdayJob(raw))
    .filter((job): job is WorkdayJob => job !== null);

  const source = await getSource("workday");
  const run = await startRun(source.id);

  try {
    const result = await processWorkdayJobs(jobs);
    await finishRun(
      run.id,
      "success",
      {
        found: result.added + result.skipped + result.filtered,
        added: result.added,
        skipped: result.skipped,
      },
      result.added > 0
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(
      run.id,
      "failed",
      { found: 0, added: 0, skipped: 0, error: message },
      false
    );
    throw error;
  }
}

export async function runWorkdayScraper(): Promise<{
  added: number;
  skipped: number;
  filtered: number;
  authError: boolean;
}> {
  const mode = await getWorkdayConnectMode();
  if (mode === "bridge") {
    throw new Error(
      "Workday is connected via browser only. Run the browser script on Jobs Hub to sync."
    );
  }

  const session = await getWorkdaySession();
  if (!session?.token) {
    throw new Error("No Workday session found. Connect via Admin → Scrapers.");
  }

  const source = await getSource("workday");
  const run = await startRun(source.id);

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFiltered = 0;

  try {
    let offset = 0;
    let totalJobs = Infinity;
    let pages = 0;

    while (offset < totalJobs && pages < MAX_PAGES) {
      let jobs: WorkdayJob[];
      try {
        const page = await fetchJobPage(session, offset);
        jobs = page.jobs;
        totalJobs = page.total;
      } catch (err) {
        if (err instanceof AuthError) {
          await finishRun(
            run.id,
            "failed",
            { found: 0, added: totalAdded, skipped: totalSkipped, error: err.message },
            false
          );
          return {
            added: totalAdded,
            skipped: totalSkipped,
            filtered: totalFiltered,
            authError: true,
          };
        }
        throw err;
      }

      if (jobs.length === 0) break;

      const batch = await processWorkdayJobs(jobs);
      totalAdded += batch.added;
      totalSkipped += batch.skipped;
      totalFiltered += batch.filtered;

      offset += jobs.length;
      pages++;
    }

    await finishRun(
      run.id,
      "success",
      {
        found: totalAdded + totalSkipped + totalFiltered,
        added: totalAdded,
        skipped: totalSkipped,
      },
      totalAdded > 0
    );

    return {
      added: totalAdded,
      skipped: totalSkipped,
      filtered: totalFiltered,
      authError: false,
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
