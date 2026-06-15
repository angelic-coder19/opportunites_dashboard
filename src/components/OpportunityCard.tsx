"use client";
// src/components/OpportunityCard.tsx

import Link from "next/link";
import { Opportunity } from "@/types";
import { formatDate, isActive } from "@/lib/utils";
import CountdownBadge from "./CountdownBadge";
import ShareButton from "./ShareButton";
import { MapPin, Mail, Phone, Calendar, ExternalLink } from "lucide-react";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

function appBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const {
    id,
    title,
    institution,
    summary,
    contactEmail,
    contactPhone,
    applicationUrl,
    datePosted,
    deadline,
    category,
    tags,
  } = opportunity;

  const active = isActive(deadline);
  const isOffCampus = category === "Off-campus summer research program";
  const shareUrl = `${appBaseUrl()}/opportunity/${id}`;

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border bg-white shadow-sm transition-all duration-200 overflow-hidden
        ${active
          ? "border-gray-200 hover:shadow-md hover:-translate-y-0.5"
          : "border-gray-100 opacity-50 grayscale"
        }`}
    >
      {/* Category accent bar */}
      <div className={`h-1.5 w-full shrink-0 ${isOffCampus ? "bg-[#efa522]" : "bg-black"}`} />

      <div className="flex flex-col flex-1 p-5 gap-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">

            {/* Pills row */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`font-heading inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest
                  ${isOffCampus ? "bg-[#efa522]/10 text-[#c47d0a]" : "bg-black/10 text-black"}`}
              >
                {isOffCampus ? "Research" : "On-Campus"}
              </span>
            </div>

            {/* Title — links to detail page */}
            <Link href={`/opportunity/${id}`} className="group/title">
              <h2 className="font-heading text-[15px] font-extrabold text-gray-900 leading-snug group-hover/title:text-[#efa522] transition-colors duration-150 line-clamp-2">
                {title}
              </h2>
            </Link>

            <p className="font-body mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 text-[#efa522] shrink-0" />
              <span className="truncate">{institution}</span>
            </p>
          </div>

          {/* Countdown + share */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <CountdownBadge deadline={deadline} />
            <ShareButton url={shareUrl} title={title} summary={summary} />
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <p className="font-body text-sm text-gray-600 leading-relaxed line-clamp-3">
            {summary}
          </p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="font-body inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-500"
              >
                {tag}
              </span>
            ))}
            {tags.length > 5 && (
              <span className="font-body inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-400">
                +{tags.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Dates */}
        {(datePosted || deadline) && (
          <div className="font-body flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 border-t border-dashed border-gray-100 pt-3">
            {datePosted && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Posted {formatDate(datePosted)}
              </span>
            )}
            {deadline && (
              <span className="flex items-center gap-1 font-semibold text-gray-500">
                <Calendar className="h-3.5 w-3.5 text-[#efa522] shrink-0" />
                Due {formatDate(deadline)}
              </span>
            )}
          </div>
        )}

        {/* Contact */}
        {(contactEmail || contactPhone) && (
          <div className="font-body flex flex-wrap gap-3 text-xs text-gray-500">
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-1 hover:text-[#efa522] transition-colors truncate"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{contactEmail}</span>
              </a>
            )}
            {contactPhone && (
              <a
                href={`tel:${contactPhone}`}
                className="flex items-center gap-1 hover:text-[#efa522] transition-colors"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {contactPhone}
              </a>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-1 flex gap-2">
          <a
            href={applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!active}
            tabIndex={active ? 0 : -1}
            className={`font-heading flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${active
                ? "bg-[#efa522] text-black hover:bg-[#d4901e] focus:ring-[#efa522] cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none"
              }`}
          >
            {active ? (
              <>Apply Now <ExternalLink className="h-4 w-4" /></>
            ) : (
              "Closed"
            )}
          </a>
          <Link
            href={`/opportunity/${id}`}
            className="font-heading flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2.5 text-xs text-gray-500 hover:border-[#efa522] hover:text-[#efa522] transition-colors"
            aria-label="View details"
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
