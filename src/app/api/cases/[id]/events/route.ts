import { randomUUID } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { caseEvents, users } from "@/lib/db/schema";
import { getEventTypeDefinition } from "@/lib/case-templates";
import { parseDeadline } from "@/lib/api/parse";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getActiveCase } from "@/lib/api/case-helpers";
import {
  createCaseEventSchema,
  validateEventForCaseType,
} from "@/lib/api/case-validation";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";
import { applyEventSideEffects } from "@/lib/services/case-events";
import type { CaseType } from "@/lib/types";

export const runtime = "nodejs";

export const GET = withAuth(async (_ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const rows = await db
    .select({ event: caseEvents, userName: users.name })
    .from(caseEvents)
    .innerJoin(users, eq(caseEvents.createdBy, users.id))
    .where(and(eq(caseEvents.caseId, id), isNull(caseEvents.deletedAt)))
    .orderBy(desc(caseEvents.occurredAt));

  return jsonOk({
    events: rows.map((r) => ({ ...r.event, userName: r.userName })),
  });
});

export const POST = withAuth(async ({ request, user }, routeCtx) => {
  const { id } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const body = await request.json();
  const parsed = createCaseEventSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  if (!validateEventForCaseType(caseData.caseType as CaseType, parsed.data.eventType)) {
    return jsonError("Bu dosya türü için geçersiz olay tipi", 400);
  }

  let occurredAt: Date;
  try {
    occurredAt = parseDeadline(parsed.data.occurredAt);
  } catch {
    return jsonError("Geçersiz olay tarihi", 400);
  }

  const eventId = randomUUID();
  const now = new Date();
  const metadata = parsed.data.metadata ?? {};

  await db.insert(caseEvents).values({
    id: eventId,
    caseId: id,
    eventType: parsed.data.eventType,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    occurredAt,
    metadata: JSON.stringify(metadata),
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  });

  await applyEventSideEffects(id, parsed.data.eventType, metadata);

  const def = getEventTypeDefinition(caseData.caseType as CaseType, parsed.data.eventType);
  await logActivity({
    caseId: id,
    action: "CASE_EVENT_ADDED",
    details: `${def?.label ?? parsed.data.eventType}: ${parsed.data.title}`,
    userId: user.id,
  });

  const created = await db.select().from(caseEvents).where(eq(caseEvents.id, eventId)).limit(1);
  return jsonOk({ event: created[0] }, { status: 201 });
});
