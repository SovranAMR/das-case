import { describe, expect, it } from "vitest";
import { getTimelineGroupLabel, groupTimelineItems } from "../src/lib/utils/timeline-groups";

describe("timeline groups", () => {
  it("bugün grubunu üretir", () => {
    const now = new Date("2026-06-05T12:00:00.000Z");
    expect(getTimelineGroupLabel(new Date("2026-06-05T08:00:00.000Z"), now)).toBe("Bugün");
  });

  it("öğeleri gruplar", () => {
    const groups = groupTimelineItems([
      { occurredAt: "2026-06-05T10:00:00.000Z" },
      { occurredAt: "2026-06-04T10:00:00.000Z" },
    ]);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]?.items.length).toBeGreaterThan(0);
  });
});
