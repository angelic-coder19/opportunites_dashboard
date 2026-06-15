// src/app/opportunity/[id]/page.tsx
// Individual opportunity detail page.
// Serves proper Open Graph meta tags so shared links preview correctly on
// WhatsApp, Twitter/X, Facebook, LinkedIn, iMessage, Discord, etc.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Mail, Phone, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, isActive } from "@/lib/utils";
import ShareButton from "@/components/ShareButton";
import CountdownBadge from "@/components/CountdownBadge";

export const revalidate = 60;

// ── helpers ──────────────────────────────────────────────────────────────────

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://ried-dashboard.vercel.app"
  );
}

async function getOpportunity(id: string) {
  return prisma.opportunity.findUnique({ where: { id } });
}

// ── Meta tags ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) {
    return { title: "Opportunity Not Found | UAPB RIED" };
  }

  const description = opp.summary
    ? opp.summary.slice(0, 160)
    : `${opp.category} at ${opp.institution}. Explore and apply through the UAPB RIED Opportunities Dashboard.`;

  const url = `${baseUrl()}/opportunity/${opp.id}`;
  const image = `${baseUrl()}/images/uapb-campus.webp`;

  return {
    title: `${opp.title} | UAPB RIED Opportunities`,
    description,
    openGraph: {
      title: opp.title,
      description,
      url,
      siteName: "UAPB RIED Opportunities Dashboard",
      images: [{ url: image, width: 1200, height: 630, alt: "UAPB Campus" }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: opp.title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) notFound();

  const deadline = opp.deadline?.toISOString().split("T")[0] ?? null;
  if (!isActive(deadline)) notFound();
  const datePosted = opp.datePosted?.toISOString().split("T")[0] ?? null;
  const shareUrl = `${baseUrl()}/opportunity/${opp.id}`;
  const isOffCampus = opp.category === "Off-campus summer research program";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">

      {/* Back link */}
      <Link
        href="/"
        className="font-heading inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#efa522] transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        All opportunities
      </Link>

      {/* Card */}
      <article className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        {/* Accent bar */}
        <div className={`h-2 w-full ${isOffCampus ? "bg-[#efa522]" : "bg-black"}`} />

        <div className="p-6 sm:p-8 flex flex-col gap-6">

          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Pills */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`font-heading inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest
                    ${isOffCampus ? "bg-[#efa522]/10 text-[#c47d0a]" : "bg-black/10 text-black"}`}
                >
                  {isOffCampus ? "Research Program" : "On-Campus Job"}
                </span>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                {opp.title}
              </h1>
              <p className="font-body mt-2 flex items-center gap-1.5 text-base text-gray-500">
                <MapPin className="h-4 w-4 text-[#efa522] shrink-0" />
                {opp.institution}
              </p>
            </div>

            <div className="flex items-start gap-2 shrink-0">
              <CountdownBadge deadline={deadline} />
              <ShareButton
                url={shareUrl}
                title={opp.title}
                summary={opp.summary}
              />
            </div>
          </div>

          {/* Dates */}
          {(datePosted || deadline) && (
            <div className="font-body flex flex-wrap items-center gap-4 text-sm text-gray-500 border-t border-dashed border-gray-100 pt-4">
              {datePosted && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Posted: {formatDate(datePosted)}
                </span>
              )}
              {deadline && (
                <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                  <Calendar className="h-4 w-4 text-[#efa522]" />
                  Deadline: {formatDate(deadline)}
                </span>
              )}
            </div>
          )}

          {/* Summary */}
          {opp.summary && (
            <div className="border-t border-gray-100 pt-4">
              <h2 className="font-heading mb-2 text-xs uppercase tracking-widest text-gray-400">
                About this opportunity
              </h2>
              <p className="font-body text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                {opp.summary}
              </p>
            </div>
          )}

          {/* Tags */}
          {opp.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {opp.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-body inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Contact */}
          {(opp.contactEmail || opp.contactPhone) && (
            <div className="font-body flex flex-wrap gap-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
              {opp.contactEmail && (
                <a
                  href={`mailto:${opp.contactEmail}`}
                  className="flex items-center gap-1.5 hover:text-[#efa522] transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {opp.contactEmail}
                </a>
              )}
              {opp.contactPhone && (
                <a
                  href={`tel:${opp.contactPhone}`}
                  className="flex items-center gap-1.5 hover:text-[#efa522] transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {opp.contactPhone}
                </a>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3">
            {opp.applicationUrl && (
              <a
                href={opp.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#efa522] px-6 py-3 text-sm font-bold tracking-wide text-black hover:bg-[#d4901e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#efa522] focus:ring-offset-2"
              >
                Apply Now
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <ShareButton
              url={shareUrl}
              title={opp.title}
              summary={opp.summary}
              variant="button"
            />
          </div>
        </div>
      </article>
    </div>
  );
}
