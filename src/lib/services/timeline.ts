import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activityLogs,
  caseEvents,
  caseNotes,
  cases,
  tasks,
  users,
} from "@/lib/db/schema";
import { getEventTypeDefinition } from "@/lib/case-templates";
import type { CaseType, TimelineSource } from "@/lib/types";

export type TimelineItem = {
  id: string;
  source: TimelineSource;
  title: string;
  description: string | null;
  occurredAt: Date;
  createdAt: Date;
  userName: string;
  userId: string;
  eventType?: string;
  category?: string;
  metadata?: Record<string, unknown> | null;
  canEdit: boolean;
  canDelete: boolean;
  referenceId: string;
};

type TimelineFilters = {
  source?: TimelineSource;
  eventType?: string;
  category?: string;
};

const systemActionLabels: Record<string, string> = {
  CASE_CREATED: "Dosya oluşturuldu",
  CASE_UPDATED: "Dosya güncellendi",
  CASE_DELETED: "Dosya silindi",
  STAGE_CHANGED: "Aşama değişti",
  TASK_CREATED: "İş oluşturuldu",
  TASK_UPDATED: "İş güncellendi",
  TASK_STATUS_CHANGED: "İş durumu değişti",
  TASK_COMPLETED: "İş tamamlandı",
  TASK_DELETED: "İş silindi",
  NOTE_ADDED: "Not eklendi",
  CASE_EVENT_ADDED: "Süreç olayı eklendi",
  CASE_EVENT_UPDATED: "Süreç olayı güncellendi",
  CASE_EVENT_DELETED: "Süreç olayı silindi",
  CASE_NOTE_ADDED: "Not eklendi",
  CASE_NOTE_UPDATED: "Not güncellendi",
  CASE_NOTE_DELETED: "Not silindi",
};

export async function buildCaseTimeline(
  caseId: string,
  filters: TimelineFilters = {},
): Promise<TimelineItem[]> {
  const caseRow = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  const caseData = caseRow[0];
  if (!caseData) return [];

  const [events, notes, activities, caseTasks] = await Promise.all([
    db
      .select({ event: caseEvents, userName: users.name })
      .from(caseEvents)
      .innerJoin(users, eq(caseEvents.createdBy, users.id))
      .where(and(eq(caseEvents.caseId, caseId), isNull(caseEvents.deletedAt)))
      .orderBy(desc(caseEvents.occurredAt)),
    db
      .select({ note: caseNotes, userName: users.name })
      .from(caseNotes)
      .innerJoin(users, eq(caseNotes.createdBy, users.id))
      .where(and(eq(caseNotes.caseId, caseId), isNull(caseNotes.deletedAt)))
      .orderBy(desc(caseNotes.createdAt)),
    db
      .select({ log: activityLogs, userName: users.name })
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .where(eq(activityLogs.caseId, caseId))
      .orderBy(desc(activityLogs.createdAt)),
    db
      .select({ task: tasks, userName: users.name })
      .from(tasks)
      .innerJoin(users, eq(tasks.createdBy, users.id))
      .where(and(eq(tasks.caseId, caseId), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.updatedAt)),
  ]);

  const items: TimelineItem[] = [];

  for (const row of events) {
    const def = getEventTypeDefinition(caseData.caseType as CaseType, row.event.eventType);
    let metadata: Record<string, unknown> | null = null;
    if (row.event.metadata) {
      try {
        metadata = JSON.parse(row.event.metadata) as Record<string, unknown>;
      } catch {
        metadata = null;
      }
    }
    items.push({
      id: `event-${row.event.id}`,
      source: "event",
      title: row.event.title,
      description: row.event.description,
      occurredAt: row.event.occurredAt,
      createdAt: row.event.createdAt,
      userName: row.userName,
      userId: row.event.createdBy,
      eventType: row.event.eventType,
      category: def?.category,
      metadata,
      canEdit: true,
      canDelete: true,
      referenceId: row.event.id,
    });
  }

  for (const row of notes) {
    items.push({
      id: `note-${row.note.id}`,
      source: "note",
      title: row.note.isPinned ? "Sabitlenmiş not" : "Not",
      description: row.note.content,
      occurredAt: row.note.createdAt,
      createdAt: row.note.createdAt,
      userName: row.userName,
      userId: row.note.createdBy,
      metadata: { isPinned: row.note.isPinned },
      canEdit: true,
      canDelete: true,
      referenceId: row.note.id,
    });
  }

  for (const row of activities) {
    if (row.log.action === "NOTE_ADDED") continue;
    items.push({
      id: `system-${row.log.id}`,
      source: "system",
      title: systemActionLabels[row.log.action] ?? row.log.action,
      description: row.log.details,
      occurredAt: row.log.createdAt,
      createdAt: row.log.createdAt,
      userName: row.userName,
      userId: row.log.userId,
      canEdit: false,
      canDelete: false,
      referenceId: row.log.id,
    });
  }

  for (const row of caseTasks) {
    if (row.task.status !== "COMPLETED") continue;
    items.push({
      id: `task-${row.task.id}`,
      source: "task",
      title: `İş tamamlandı: ${row.task.title}`,
      description: row.task.description,
      occurredAt: row.task.completedAt ?? row.task.updatedAt,
      createdAt: row.task.updatedAt,
      userName: row.userName,
      userId: row.task.createdBy,
      canEdit: false,
      canDelete: false,
      referenceId: row.task.id,
    });
  }

  let filtered = items;
  if (filters.source) {
    filtered = filtered.filter((item) => item.source === filters.source);
  }
  if (filters.eventType) {
    filtered = filtered.filter((item) => item.eventType === filters.eventType);
  }
  if (filters.category) {
    filtered = filtered.filter((item) => item.category === filters.category);
  }

  return filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
