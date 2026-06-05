import { describe, expect, it } from "vitest";
import {
  buildReminderSchedule,
  calculateRemindAt,
} from "../src/lib/reminders/calculate";

describe("calculateRemindAt", () => {
  it("deadline'dan gün önce hesaplar", () => {
    const deadline = new Date("2026-06-10T12:00:00.000Z");
    const remindAt = calculateRemindAt(deadline, { days: 3 });
    expect(remindAt.toISOString()).toBe("2026-06-07T12:00:00.000Z");
  });

  it("deadline'dan saat önce hesaplar", () => {
    const deadline = new Date("2026-06-10T12:00:00.000Z");
    const remindAt = calculateRemindAt(deadline, { hours: 2 });
    expect(remindAt.toISOString()).toBe("2026-06-10T10:00:00.000Z");
  });

  it("gün ve saat birlikte hesaplar", () => {
    const deadline = new Date("2026-06-10T12:00:00.000Z");
    const remindAt = calculateRemindAt(deadline, { days: 1, hours: 2 });
    expect(remindAt.toISOString()).toBe("2026-06-09T10:00:00.000Z");
  });
});

describe("buildReminderSchedule", () => {
  it("geçmiş hatırlatıcıları filtreler", () => {
    const now = new Date("2026-06-08T12:00:00.000Z");
    const deadline = new Date("2026-06-10T12:00:00.000Z");
    const schedule = buildReminderSchedule(
      deadline,
      [{ days: 7 }, { days: 3 }, { days: 1 }],
      now,
    );

    expect(schedule).toHaveLength(1);
    expect(schedule[0]?.toISOString()).toBe("2026-06-09T12:00:00.000Z");
  });

  it("aynı zamanı tekilleştirir", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const deadline = new Date("2026-06-10T12:00:00.000Z");
    const schedule = buildReminderSchedule(
      deadline,
      [{ days: 3 }, { days: 3 }],
      now,
    );

    expect(schedule).toHaveLength(1);
  });
});
