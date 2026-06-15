// src/app/api/chat/route.ts
// Public AI assistant endpoint. Streams an OpenAI response to the client.
// Gracefully handles missing keys, quota errors, and network failures.

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an AI assistant for the UAPB (University of Arkansas at Pine Bluff) Opportunities Dashboard — a student-facing platform managed by the Office of Research, Innovation & Economic Development (RIED).

Your role is to help UAPB students:
- Find and understand the research and job opportunities listed on this platform
- Learn the difference between on-campus jobs and off-campus summer research programs (REUs)
- Understand deadlines, eligibility requirements, and how to apply
- Navigate the search and filter features
- Understand what REU (Research Experience for Undergraduates), Pathways to Science, ColorStack, and REUFinder programs are
- Get encouragement and guidance about pursuing research as an HBCU student

Key facts about the platform:
- Opportunities come from three automatic sources: REUFinder.com (weekly), Pathways to Science (monthly), and ColorStack (daily), plus manually added ones by UAPB staff
- The dashboard is for UAPB students specifically — an HBCU in Pine Bluff, Arkansas
- You can search by keyword or filter by category (on-campus vs. off-campus)
- Deadlines matter — expired opportunities are automatically hidden
- For questions about specific programs, encourage students to click the "Apply Now" button on a card to visit the official source

Tone: warm, encouraging, and professional. You're helping students from an HBCU access research and career opportunities. Be concise — your responses will appear in a small chat panel.

If you don't know something specific about a particular opportunity, say so and direct them to read the full listing or contact RIED at ried@uapb.edu or (870) 575-8000.`;

// Simple in-memory rate limiter: max 20 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  // Parse body
  let messages: { role: "user" | "assistant"; content: string }[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error("bad");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Validate API key presence
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "The AI assistant is not configured yet. Please contact the UAPB RIED office at ried@uapb.edu for help.",
      },
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        // Only send the last 10 messages to keep context manageable
        ...messages.slice(-10),
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error("[chat] OpenAI error:", err);

    // Map OpenAI error types to user-friendly messages
    const errObj = err as { status?: number; code?: string; message?: string };
    const status = errObj?.status ?? 0;
    const code = errObj?.code ?? "";

    if (status === 401 || code === "invalid_api_key") {
      return NextResponse.json(
        { error: "The assistant service is not properly configured. Please contact ried@uapb.edu." },
        { status: 503 }
      );
    }
    if (status === 429 || code === "insufficient_quota" || code === "rate_limit_exceeded") {
      return NextResponse.json(
        {
          error:
            "The assistant is temporarily unavailable due to high demand. Please try again in a few minutes, or contact the RIED office directly at ried@uapb.edu.",
        },
        { status: 503 }
      );
    }
    if (status >= 500) {
      return NextResponse.json(
        {
          error:
            "The AI service is experiencing issues right now. We apologize for the inconvenience — please try again shortly or reach us at ried@uapb.edu.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong with the assistant. Please try again, or contact ried@uapb.edu for direct support.",
      },
      { status: 500 }
    );
  }
}
