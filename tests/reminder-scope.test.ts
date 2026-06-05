import { describe, expect, it } from "vitest";
import { canUserReceiveReminder } from "@/lib/reminders/scope";

describe("canUserReceiveReminder", () => {
  const audience = {
    assignedTo: "user-a",
    createdBy: "user-b",
  };

  it("ADMIN tüm hatırlatıcıları alır", () => {
    expect(canUserReceiveReminder("admin-1", "ADMIN", audience)).toBe(true);
  });

  it("atanan kullanıcı alır", () => {
    expect(canUserReceiveReminder("user-a", "LAWYER", audience)).toBe(true);
  });

  it("oluşturan kullanıcı alır", () => {
    expect(canUserReceiveReminder("user-b", "SECRETARY", audience)).toBe(true);
  });

  it("ilgisiz kullanıcı alamaz", () => {
    expect(canUserReceiveReminder("user-c", "LAWYER", audience)).toBe(false);
  });

  it("atanan null ise sadece oluşturan alır", () => {
    const unassigned = { assignedTo: null, createdBy: "user-b" };
    expect(canUserReceiveReminder("user-a", "LAWYER", unassigned)).toBe(false);
    expect(canUserReceiveReminder("user-b", "LAWYER", unassigned)).toBe(true);
  });
});
