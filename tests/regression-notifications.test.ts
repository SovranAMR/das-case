import { describe, expect, it } from "vitest";
import { canUserReceiveReminder } from "@/lib/reminders/scope";
import { ESCALATION_DAYS } from "@/lib/services/escalation";

describe("notification regression guards", () => {
  it("hatırlatıcı kapsamı ilgisiz kullanıcıya kapalı", () => {
    expect(
      canUserReceiveReminder("outsider", "LAWYER", {
        assignedTo: "user-a",
        createdBy: "user-b",
      }),
    ).toBe(false);
  });

  it("escalation eşiği 3 gün", () => {
    expect(ESCALATION_DAYS).toBe(3);
  });
});
