import { describe, expect, it } from "vitest";
import {
  dismissEscalation,
  getEscalationNotifications,
} from "@/lib/services/escalation";
import { createTestDb, seedAdminUser, seedOverdueTask } from "../helpers/test-db";

describe("escalation integration", () => {
  it("4 gün gecikmiş iş admin bildiriminde görünür", async () => {
    const { db, cleanup } = createTestDb();
    try {
      const adminId = await seedAdminUser(db);
      const taskId = await seedOverdueTask(db, adminId, 4);

      const items = await getEscalationNotifications(adminId, new Date(), db);
      expect(items.some((item) => item.taskId === taskId)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("dismiss sonrası aynı iş listeden düşer", async () => {
    const { db, cleanup } = createTestDb();
    try {
      const adminId = await seedAdminUser(db);
      const taskId = await seedOverdueTask(db, adminId, 5);

      expect(await dismissEscalation(taskId, adminId, db)).toBe(true);

      const items = await getEscalationNotifications(adminId, new Date(), db);
      expect(items.some((item) => item.taskId === taskId)).toBe(false);
    } finally {
      cleanup();
    }
  });
});
