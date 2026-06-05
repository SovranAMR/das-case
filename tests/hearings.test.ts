import { describe, expect, it } from "vitest";
import { getHearingUrgency, isUpcomingHearing } from "@/lib/utils/hearings";

describe("hearings", () => {
  const now = new Date("2026-06-05T10:00:00");

  it("marks same-day hearing as today", () => {
    const hearing = new Date("2026-06-05T14:00:00");
    expect(getHearingUrgency(hearing, now)).toBe("today");
  });

  it("marks hearing within 3 days as soon", () => {
    const hearing = new Date("2026-06-07T14:00:00");
    expect(getHearingUrgency(hearing, now)).toBe("soon");
  });

  it("detects upcoming hearings within window", () => {
    const hearing = new Date("2026-06-12T14:00:00");
    expect(isUpcomingHearing(hearing, now, 14)).toBe(true);
  });

  it("excludes past hearings outside today", () => {
    const hearing = new Date("2026-06-01T14:00:00");
    expect(isUpcomingHearing(hearing, now, 14)).toBe(false);
  });
});
