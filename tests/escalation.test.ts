import { describe, expect, it } from "vitest";
import { parseEscalationNotificationId } from "@/lib/services/escalation";

describe("parseEscalationNotificationId", () => {
  it("escalation prefix ile task id döner", () => {
    expect(parseEscalationNotificationId("escalation-task-123")).toBe("task-123");
  });

  it("reminder id için null döner", () => {
    expect(parseEscalationNotificationId("reminder-abc")).toBeNull();
  });
});
