import { describe, expect, it } from "vitest";
import { getUrgencyRowClassName } from "../src/lib/utils/urgency-styles";

describe("urgency row styles", () => {
  it("gecikmiş ve bugün için belirgin sınıflar döner", () => {
    expect(getUrgencyRowClassName("overdue")).toContain("border-l-red-600");
    expect(getUrgencyRowClassName("overdue")).toContain("bg-red-50");
    expect(getUrgencyRowClassName("today")).toContain("border-l-orange-600");
    expect(getUrgencyRowClassName("today")).toContain("bg-orange-50");
  });

  it("normal ve tamamlanan için boş döner", () => {
    expect(getUrgencyRowClassName("normal")).toBe("");
    expect(getUrgencyRowClassName("completed")).toBe("");
  });
});
