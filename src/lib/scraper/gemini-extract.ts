// src/lib/scraper/gemini-extract.ts
// Sends blog post text to Google Gemini and returns structured program data.

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedOpportunity } from "./index";

// Verify this string against your Google AI Studio dashboard.
const MODEL = "gemini-2.5-flash";

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_API_KEY is not set. Add it to .env.local (local) or to the Vercel project env vars (deployed)."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

function currentAndNextYear(): { current: number; next: number } {
  const now = new Date();
  return { current: now.getFullYear(), next: now.getFullYear() + 1 };
}

export async function extractOpportunitiesFromText(
  rawText: string,
  postUrl: string
): Promise<{ programs: ExtractedOpportunity[]; tokensUsed: number }> {
  const { current, next } = currentAndNextYear();

  const prompt = `You are extracting research opportunity listings from a blog post about undergraduate research programs.

Return a JSON array. Each element must have exactly these keys:
  "title"           — string, required. The name of the program.
  "institution"     — string, required. Hosting university or organization.
  "summary"         — string, required. Write 2-3 sentences summarizing the opportunity from the description provided.
  "deadline"        — string or null. Convert to YYYY-MM-DD. If only MM/DD is given, use year ${current} unless that date has already passed, then use ${next}.
  "applicationUrl"  — string or null. The external apply URL for THIS program. Hyperlinks appear in the text as "Anchor Text (https://example.com)". Choose the URL whose anchor text or surrounding context says "Apply", "Apply Now", "Apply Here", "Program Website", "Learn More", or similar. Do NOT use reufinder.com URLs. Do NOT use social-media URLs. If none of the links clearly point to an apply / program page, return null.
  "contactEmail"    — string or null.
  "citizenshipReq"  — string or null. e.g. "US Citizens & Permanent Residents"
  "levels"          — string or null. e.g. "Sophomores, Juniors, Seniors"
  "tags"            — string array. 3-6 subject or keyword tags inferred from the description. Use title case.

Rules:
- Output ONLY valid JSON. No markdown code fences. No explanation before or after.
- If a field is missing from the source text, use null — not an empty string.
- One object per distinct program. If a program appears twice, include it once.
- Do not invent information not present in the text.

Blog post URL: ${postUrl}

Blog post content:
${rawText.slice(0, 12000)}`;

  const model = getClient().getGenerativeModel({ model: MODEL });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const raw = response.text();

  // Track token usage for cost monitoring in scrape_runs
  const usage = response.usageMetadata;
  const tokensUsed =
    (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0);

  // Strip any markdown fences Gemini might add despite instructions
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const programs: ExtractedOpportunity[] = JSON.parse(cleaned);
  return { programs, tokensUsed };
}