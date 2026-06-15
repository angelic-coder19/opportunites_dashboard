// src/types/admin.ts
// Admin-only superset of the public Opportunity interface. Includes fields the
// public dashboard doesn't show but the admin panel must manage: source,
// status, isFeatured, source_id, timestamps. Derived from Prisma so it stays
// in sync with the schema.

import type { Prisma } from "@/generated/prisma";

export type AdminOpportunity = Prisma.OpportunityGetPayload<{}>;

export const OPPORTUNITY_CATEGORIES = [
  "Off-campus summer research program",
  "On-campus job",
] as const;

export const OPPORTUNITY_STATUSES = ["active", "draft", "archived"] as const;

export const OPPORTUNITY_SOURCES = [
  "manual",
  "scrape_reufinder",
  "scrape_pathways",
  "scrape_colorstack",
  "scrape_workday",
  "faculty",
] as const;

export type OpportunityCategoryValue = (typeof OPPORTUNITY_CATEGORIES)[number];
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type OpportunitySource = (typeof OPPORTUNITY_SOURCES)[number];
