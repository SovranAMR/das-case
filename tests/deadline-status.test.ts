import { describe, expect, it } from "vitest";
import {
  getDeadlineUrgency,
  isDueThisWeek,
  isDueToday,
  isOverdue,
} from "../src/lib/utils/dates";

const now = new Date("2026-06-05T10:00:00.000Z");

describe("deadline urgency", () => {
  it("gecikmiş işleri işaretler", () => {
    const deadline = new Date("2026-06-04T10:00:00.000Z");
    expect(getDeadlineUrgency(deadline, "PENDING", now)).toBe("overdue");
    expect(isOverdue(deadline, "PENDING", now)).toBe(true);
  });

  it("bugün biten işleri işaretler", () => {
    const deadline = new Date("2026-06-05T18:00:00.000Z");
    expect(getDeadlineUrgency(deadline, "PENDING", now)).toBe("today");
    expect(isDueToday(deadline, "PENDING", now)).toBe(true);
  });

  it("3 gün içindekileri soon yapar", () => {
    const deadline = new Date("2026-06-07T10:00:00.000Z");
    expect(getDeadlineUrgency(deadline, "PENDING", now)).toBe("soon");
  });

  it("tamamlanan işleri completed yapar", () => {
    const deadline = new Date("2026-06-01T10:00:00.000Z");
    expect(getDeadlineUrgency(deadline, "COMPLETED", now)).toBe("completed");
    expect(isOverdue(deadline, "COMPLETED", now)).toBe(false);
  });

  it("bu hafta filtresi çalışır", () => {
    const deadline = new Date("2026-06-06T10:00:00.000Z");
    expect(isDueThisWeek(deadline, "PENDING", now)).toBe(true);
  });
});
