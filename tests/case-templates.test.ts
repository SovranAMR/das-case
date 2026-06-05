import { describe, expect, it } from "vitest";
import {
  getAllTemplates,
  getCaseTemplate,
  isValidEventType,
  isValidStage,
} from "../src/lib/case-templates";

describe("case templates", () => {
  it("4 dosya türü şablonu döner", () => {
    expect(getAllTemplates()).toHaveLength(4);
  });

  it("hukuk dosyası OPENED aşaması geçerli", () => {
    expect(isValidStage("HUKUK", "OPENED")).toBe(true);
    expect(isValidStage("HUKUK", "INVALID")).toBe(false);
  });

  it("icra ödeme emri olayı geçerli", () => {
    expect(isValidEventType("ICRA", "PAYMENT_ORDER")).toBe(true);
    expect(isValidEventType("ICRA", "HEARING_HELD")).toBe(false);
  });

  it("her şablonda en az bir olay tipi var", () => {
    for (const template of getAllTemplates()) {
      expect(template.eventTypes.length).toBeGreaterThan(0);
      expect(template.stages[0]?.code).toBe("OPENED");
    }
  });

  it("hukuk şablonu duruşma olayı içerir", () => {
    const template = getCaseTemplate("HUKUK");
    expect(template.eventTypes.some((e) => e.code === "HEARING_HELD")).toBe(true);
  });
});
