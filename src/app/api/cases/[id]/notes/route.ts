import { randomUUID } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { caseNotes, users } from "@/lib/db/schema";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getActiveCase } from "@/lib/api/case-helpers";
import { createCaseNoteSchema } from "@/lib/api/case-validation";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";

export const runtime = "nodejs";

export const GET = withAuth(async ({ request }, routeCtx) => {
  const { id } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase();

  const rows = await db
    .select({ note: caseNotes, userName: users.name })
    .from(caseNotes)
    .innerJoin(users, eq(caseNotes.createdBy, users.id))
    .where(and(eq(caseNotes.caseId, id), isNull(caseNotes.deletedAt)))
    .orderBy(desc(caseNotes.isPinned), desc(caseNotes.updatedAt));

  const notes = rows
    .map((r) => ({ ...r.note, userName: r.userName }))
    .filter((n) => (q ? n.content.toLowerCase().includes(q) : true));

  return jsonOk({ notes });
});

export const POST = withAuth(async ({ request, user }, routeCtx) => {
  const { id } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const body = await request.json();
  const parsed = createCaseNoteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz not", 400);
  }

  const noteId = randomUUID();
  const now = new Date();

  await db.insert(caseNotes).values({
    id: noteId,
    caseId: id,
    content: parsed.data.content,
    isPinned: parsed.data.isPinned ?? false,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  });

  await logActivity({
    caseId: id,
    action: "CASE_NOTE_ADDED",
    details: parsed.data.content.slice(0, 200),
    userId: user.id,
  });

  const created = await db.select().from(caseNotes).where(eq(caseNotes.id, noteId)).limit(1);
  return jsonOk({ note: created[0] }, { status: 201 });
});
