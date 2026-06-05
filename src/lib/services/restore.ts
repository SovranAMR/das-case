import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { caseEvents, caseNotes, cases, tasks } from "@/lib/db/schema";

type AppDb = typeof db;

export async function restoreTask(id: string, database: AppDb = db): Promise<boolean> {
  const rows = await database.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!rows[0]?.deletedAt) return false;
  await database
    .update(tasks)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(tasks.id, id));
  return true;
}

export async function restoreCase(id: string, database: AppDb = db): Promise<boolean> {
  const rows = await database.select().from(cases).where(eq(cases.id, id)).limit(1);
  if (!rows[0]?.deletedAt) return false;
  await database
    .update(cases)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(cases.id, id));
  return true;
}

export async function restoreCaseNote(
  noteId: string,
  database: AppDb = db,
): Promise<{ caseId: string } | null> {
  const rows = await database.select().from(caseNotes).where(eq(caseNotes.id, noteId)).limit(1);
  if (!rows[0]?.deletedAt) return null;
  await database
    .update(caseNotes)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(caseNotes.id, noteId));
  return { caseId: rows[0].caseId };
}

export async function restoreCaseEvent(
  eventId: string,
  database: AppDb = db,
): Promise<{ caseId: string } | null> {
  const rows = await database.select().from(caseEvents).where(eq(caseEvents.id, eventId)).limit(1);
  if (!rows[0]?.deletedAt) return null;
  await database
    .update(caseEvents)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(caseEvents.id, eventId));
  return { caseId: rows[0].caseId };
}
