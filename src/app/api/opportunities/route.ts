// src/app/api/opportunities/route.ts
// Admin-only (gated by middleware).
//   GET  → paginated list with optional filters
//   POST → create a new MANUAL opportunity

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  OpportunityListQuerySchema,
  OpportunityWriteSchema,
  PAGE_SIZE,
} from "@/lib/validation/opportunity";

export async function GET(req: NextRequest) {
  const parsed = OpportunityListQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { page, q, status, category, source } = parsed.data;

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(source ? { source } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { institution: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.opportunity.count({ where }),
    prisma.opportunity.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows,
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = OpportunityWriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // source is always 'manual' on the admin route — admins cannot impersonate a
  // scraper source (which would collide on @@unique([source, sourceId])).
  const created = await prisma.opportunity.create({
    data: {
      ...parsed.data,
      source: "manual",
      sourceId: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true, row: created }, { status: 201 });
}
