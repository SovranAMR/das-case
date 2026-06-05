import { describe, expect, it } from "vitest";
import {
  formatAssignmentAge,
  getAssignmentAgeDays,
  resolveAssignmentDate,
} from "@/lib/utils/sla";

describe("assignment SLA helpers", () => {
  it("assignedAt varsa onu kullanır", () => {
    const now = new Date("2026-06-05T12:00:00");
    const created = new Date("2026-06-01T08:00:00");
    const assigned = new Date("2026-06-04T08:00:00");
    expect(getAssignmentAgeDays(assigned, now)).toBe(1);
    expect(formatAssignmentAge(assigned, created, now)).toBe("1 gündür bekliyor");
  });

  it("assignedAt yoksa createdAt fallback", () => {
    const now = new Date("2026-06-05T12:00:00");
    const created = new Date("2026-06-05T08:00:00");
    expect(resolveAssignmentDate(null, created)).toEqual(created);
    expect(formatAssignmentAge(null, created, now)).toBe("Bugün atandı");
  });
});
