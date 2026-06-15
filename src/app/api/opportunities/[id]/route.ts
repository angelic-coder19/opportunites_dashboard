// src/app/api/opportunities/[id]/route.ts
// Admin-only (gated by middleware).
//   GET    → single row
//   PUT    → full replace of mutable fields, with optimistic-lock check
//   PATCH  → partial update (used by status toggle, featured toggle)
//   DELETE → only allowed when row.source === 'manual'
//
// `source`, `sourceId`, `id`, `createdAt` are NEVER writable from these endpoints.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  OpportunityPatchSchema,
  OpportunityWriteSchema,
} from "@/lib/validation/opportunity";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const row = await prisma.opportunity.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PUT(req: NextRequest, { params }: Params) {
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

  // Optimistic lock: client may include an updatedAt the row had when it was
  // loaded. If the DB row is newer, refuse the write.
  const expectedUpdatedAt =
    body && typeof body === "object" && "updatedAt" in body
      ? new Date(String((body as { updatedAt: unknown }).updatedAt))
      : null;

  const current = await prisma.opportunity.findUnique({
    where: { id: params.id },
  });
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    expectedUpdatedAt &&
    !Number.isNaN(expectedUpdatedAt.getTime()) &&
    current.updatedAt.getTime() > expectedUpdatedAt.getTime()
  ) {
    return NextResponse.json(
      {
        error:
          "This row was modified elsewhere. Reload and try again.",
        currentUpdatedAt: current.updatedAt,
      },
      { status: 409 }
    );
  }

  try {
    const updated = await prisma.opportunity.update({
      where: { id: params.id },
      data: parsed.data, // source/sourceId/id/createdAt not in the schema → safe
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return NextResponse.json({ ok: true, row: updated });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = OpportunityPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.opportunity.update({
      where: { id: params.id },
      data: parsed.data,
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return NextResponse.json({ ok: true, row: updated });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  // Server-side enforcement: scraped rows are archive-only. UI disables this
  // button as a hint, but the actual gate lives here.
  const current = await prisma.opportunity.findUnique({
    where: { id: params.id },
    select: { source: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (current.source !== "manual") {
    return NextResponse.json(
      {
        error:
          "Cannot hard-delete a scraped row. Archive it instead — otherwise the next cron will re-insert it.",
      },
      { status: 409 }
    );
  }

  await prisma.opportunity.delete({ where: { id: params.id } });
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
