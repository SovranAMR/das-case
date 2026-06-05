import { describe, expect, it } from "vitest";
import { escapeLikePattern, toLikePattern } from "@/lib/search/escape-like";

describe("escapeLikePattern", () => {
  it("özel karakterleri kaçırır", () => {
    expect(escapeLikePattern("50%_test")).toBe("50\\%\\_test");
  });
});

describe("toLikePattern", () => {
  it("sorguyu LIKE pattern yapar", () => {
    expect(toLikePattern("abc")).toBe("%abc%");
  });

  it("boş sorguda % döner", () => {
    expect(toLikePattern("  ")).toBe("%");
  });
});
