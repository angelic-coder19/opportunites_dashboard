// src/lib/validation/opportunity.ts
// Shared Zod schemas for the admin CRUD endpoints. Reused on the client form
// for early feedback and on the server for the source of truth.

import { z } from "zod";
import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_STATUSES,
} from "@/types/admin";

const nullable = <T extends z.ZodTypeAny>(s: T) =>
  s.nullable().optional().transform((v) => (v === undefined ? null : v));

// HTML <input type="date"> emits YYYY-MM-DD. z.coerce.date() parses that as
// UTC midnight, which is exactly what Prisma's @db.Date column stores — no
// timezone drift. Do not add TZ math here.
const optionalDate = z
  .union([z.coerce.date(), z.literal("")])
  .nullable()
  .optional()
  .transform((v) => (v === undefined || v === null || v === "" ? null : v));

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .nullable()
  .optional()
  .transform((v) => (v === undefined || v === null || v === "" ? null : v));

const optionalEmail = z
  .union([z.string().email(), z.literal("")])
  .nullable()
  .optional()
  .transform((v) => (v === undefined || v === null || v === "" ? null : v));

const optionalString = (max: number) =>
  z
    .union([z.string().max(max), z.literal("")])
    .nullable()
    .optional()
    .transform((v) => (v === undefined || v === null || v === "" ? null : v));

/**
 * Full create/replace shape. The admin form sends this; the server NEVER
 * trusts `source` or `sourceId` from this payload — they are always set to
 * 'manual' / null by the route handler.
 */
export const OpportunityWriteSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  institution: z.string().min(1, "Institution is required").max(300),
  category: z.enum(OPPORTUNITY_CATEGORIES),
  status: z.enum(OPPORTUNITY_STATUSES).default("active"),
  summary: optionalString(2000),
  deadline: optionalDate,
  datePosted: optionalDate,
  applicationUrl: optionalUrl,
  contactEmail: optionalEmail,
  contactPhone: optionalString(40),
  tags: z.array(z.string().min(1).max(60)).max(20).default([]),
  isFeatured: z.boolean().default(false),
});

/** Partial form used by PATCH endpoints (status toggle, featured toggle). */
export const OpportunityPatchSchema = OpportunityWriteSchema.partial().strict();

export type OpportunityWriteInput = z.infer<typeof OpportunityWriteSchema>;
export type OpportunityPatchInput = z.infer<typeof OpportunityPatchSchema>;

/** Query params for the list endpoint. */
export const OpportunityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().trim().max(200).optional(),
  status: z.enum(OPPORTUNITY_STATUSES).optional(),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional(),
  source: z.string().optional(),
});

export const PAGE_SIZE = 50;
