"use client";
// src/components/OpportunityCard.tsx

import { Opportunity } from "@/types";
import { formatDate, isActive } from "@/lib/utils";
import CountdownBadge from "./CountdownBadge";
import { MapPin, Mail, Phone, Calendar, ExternalLink, Tag } from "lucide-react";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const {
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

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border bg-white shadow-sm transition-all duration-300 overflow-hidden
        ${active
          ? "border-gray-200 hover:shadow-lg hover:-translate-y-0.5"
          : "border-gray-100 opacity-55 grayscale"
        }`}
    >
      {/* Category accent bar */}
      <div className={`h-1.5 w-full ${isOffCampus ? "bg-[#efa522]" : "bg-black"}`} />

      <div className="flex flex-col flex-1 p-6 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Category pill */}
            <span
              className={`font-heading inline-block mb-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest
                ${isOffCampus
                  ? "bg-[#efa522]/10 text-[#c47d0a]"
                  : "bg-black/10 text-black"
                }`}
            >
              {category}
            </span>

            <h2 className="font-heading text-base font-extrabold text-gray-900 leading-snug group-hover:text-[#efa522] transition-colors duration-200">
              {title}
            </h2>

            <p className="font-body mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 text-[#efa522] shrink-0" />
              {institution}
            </p>
          </div>

          <CountdownBadge deadline={deadline} />
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
            {tags.map((tag) => (
              <span
                key={tag}
                className="font-body inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-600"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Dates */}
        {(datePosted || deadline) && (
          <div className="font-body flex items-center gap-4 text-xs text-gray-400 border-t border-dashed border-gray-100 pt-3">
            {datePosted && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Posted: {formatDate(datePosted)}
              </span>
            )}
            {deadline && (
              <span className="flex items-center gap-1 font-semibold text-gray-500">
                <Calendar className="h-3.5 w-3.5 text-[#efa522]" />
                Deadline: {formatDate(deadline)}
              </span>
            )}
          </div>
        )}

        {/* Contact */}
        {(contactEmail || contactPhone) && (
          <div className="font-body flex flex-wrap gap-3 text-xs text-gray-500">
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-1 hover:text-[#efa522] transition-colors">
                <Mail className="h-3.5 w-3.5" />
                {contactEmail}
              </a>
            )}
            {contactPhone && (
              <a href={`tel:${contactPhone}`} className="flex items-center gap-1 hover:text-[#efa522] transition-colors">
                <Phone className="h-3.5 w-3.5" />
                {contactPhone}
              </a>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          <a
            href={applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!active}
            tabIndex={active ? 0 : -1}
            className={`font-heading flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${active
                ? "bg-[#efa522] text-black hover:bg-[#d4901e] focus:ring-[#efa522] cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none"
              }`}
          >
            {active ? (
              <><span>Apply Now</span><ExternalLink className="h-4 w-4" /></>
            ) : (
              "Applications Closed"
            )}
          </a>
        </div>
      </div>
    </article>
  );
}
