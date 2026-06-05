import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases } from "@/lib/db/schema";

export async function getActiveCase(caseId: string) {
  const rows = await db
    .select()
    .from(cases)
    .where(and(eq(cases.id, caseId), isNull(cases.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export function canModifyRecord(
  userId: string,
  userRole: string,
  recordCreatorId: string,
): boolean {
  return userRole === "ADMIN" || userId === recordCreatorId;
}
