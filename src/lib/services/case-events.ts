import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases } from "@/lib/db/schema";
import { getEventTypeDefinition } from "@/lib/case-templates";
import { parseDeadline } from "@/lib/api/parse";
import type { CaseType } from "@/lib/types";

export async function applyEventSideEffects(
  caseId: string,
  eventType: string,
  metadata: Record<string, unknown> | undefined,
): Promise<void> {
  const caseRows = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  const caseData = caseRows[0];
  if (!caseData) return;

  const def = getEventTypeDefinition(caseData.caseType as CaseType, eventType);
  const updates: Partial<typeof cases.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (def?.suggestedStage) {
    updates.currentStage = def.suggestedStage;
  }

  if (metadata?.nextHearingAt && typeof metadata.nextHearingAt === "string") {
    try {
      updates.nextHearingAt = parseDeadline(metadata.nextHearingAt);
    } catch {
      // ignore invalid date in metadata
    }
  }

  if (Object.keys(updates).length > 1) {
    await db.update(cases).set(updates).where(eq(cases.id, caseId));
  }
}
