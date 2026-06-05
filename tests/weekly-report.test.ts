import { describe, expect, it } from "vitest";
import { getWeekEndLabel, getWeekStart } from "@/lib/services/weekly-report";

describe("getWeekStart", () => {
  it("Perşembe için hafta Pazartesi başlar", () => {
    const thursday = new Date("2026-06-04T15:00:00");
    const start = getWeekStart(thursday);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(5);
  });

  it("hafta etiketi Pazar ile biter", () => {
    const monday = new Date("2026-06-01T00:00:00");
    const endLabel = getWeekEndLabel(monday);
    expect(endLabel.getDay()).toBe(0);
    expect(endLabel.getDate()).toBe(7);
  });
});
