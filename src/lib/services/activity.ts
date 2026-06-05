import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

type ActivityInput = {
  caseId?: string | null;
  taskId?: string | null;
  action: string;
  details?: string | null;
  userId: string;
};

export async function logActivity(input: ActivityInput): Promise<void> {
  await db.insert(activityLogs).values({
    id: randomUUID(),
    caseId: input.caseId ?? null,
    taskId: input.taskId ?? null,
    action: input.action,
    details: input.details ?? null,
    userId: input.userId,
  });
}
