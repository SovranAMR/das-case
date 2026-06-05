import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { tasks } from "@/lib/db/schema";
import { restoreTask } from "@/lib/services/restore";
import { createTestDb, seedAdminUser, seedSoftDeletedTask } from "../helpers/test-db";

describe("restoreTask integration", () => {
  it("soft-deleted işi geri alır", async () => {
    const { db, cleanup } = createTestDb();
    try {
      const adminId = await seedAdminUser(db);
      const taskId = await seedSoftDeletedTask(db, adminId);

      expect(await restoreTask(taskId, db)).toBe(true);

      const rows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      expect(rows[0]?.deletedAt).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("silinmemiş iş için false döner", async () => {
    const { db, cleanup } = createTestDb();
    try {
      const adminId = await seedAdminUser(db);
      const taskId = await seedSoftDeletedTask(db, adminId);
      await restoreTask(taskId, db);

      expect(await restoreTask(taskId, db)).toBe(false);
    } finally {
      cleanup();
    }
  });
});
