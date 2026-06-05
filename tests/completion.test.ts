import { describe, expect, it } from "vitest";
import {
  formatCompletionLabel,
  getCompletionTiming,
} from "../src/lib/utils/completion";

describe("completion timing", () => {
  const deadline = new Date("2026-06-10T17:00:00.000Z");

  it("erken tamamlamayı işaretler", () => {
    const completedAt = new Date("2026-06-05T10:00:00.000Z");
    expect(getCompletionTiming(deadline, completedAt)).toBe("early");
    expect(formatCompletionLabel(deadline, completedAt)).toBe("5 gün erken tamamlandı");
  });

  it("zamanında tamamlamayı işaretler", () => {
    const completedAt = new Date("2026-06-10T09:00:00.000Z");
    expect(getCompletionTiming(deadline, completedAt)).toBe("on_time");
    expect(formatCompletionLabel(deadline, completedAt)).toBe("Zamanında tamamlandı");
  });

  it("geç tamamlamayı işaretler", () => {
    const completedAt = new Date("2026-06-12T10:00:00.000Z");
    expect(getCompletionTiming(deadline, completedAt)).toBe("late");
    expect(formatCompletionLabel(deadline, completedAt)).toBe("2 gün geç tamamlandı");
  });
});
