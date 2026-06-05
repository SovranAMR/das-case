import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { tasks } from "@/lib/db/schema";
import { createTestDb, seedAdminUser } from "../helpers/test-db";

describe("task archive integration", () => {
  it("archivedAt set edilince aktif listeden düşer", async () => {
    const { db, cleanup } = createTestDb();
    try {
      const userId = await seedAdminUser(db);
      const id = randomUUID();
      const now = new Date();
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() - 1);

      await db.insert(tasks).values({
        id,
        title: "Tamamlanan iş",
        deadline,
        status: "COMPLETED",
        completedAt: now,
        assignedTo: userId,
        assignedAt: now,
        reminderOffsets: "[]",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      await db
        .update(tasks)
        .set({ archivedAt: now, updatedAt: now })
        .where(eq(tasks.id, id));

      const row = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
      expect(row[0]?.archivedAt).not.toBeNull();
      expect(row[0]?.status).toBe("COMPLETED");
    } finally {
      cleanup();
    }
  });
});
