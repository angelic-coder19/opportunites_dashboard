// src/lib/opportunity-lookup.ts

import { prisma } from "@/lib/prisma";
import {
  isUuidParam,
  parseShortIdFromSlug,
} from "@/lib/opportunity-url";

export async function findOpportunityBySlugOrId(param: string) {
  if (isUuidParam(param)) {
    return prisma.opportunity.findUnique({ where: { id: param } });
  }

  const shortId = parseShortIdFromSlug(param);
  if (shortId) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id::text AS id
      FROM opportunities
      WHERE id::text LIKE ${`${shortId}%`}
      LIMIT 1
    `;
    const id = rows[0]?.id;
    if (id) {
      return prisma.opportunity.findUnique({ where: { id } });
    }
  }

  return null;
}
