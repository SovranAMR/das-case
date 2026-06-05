import { describe, expect, it } from "vitest";
import { parseSortParam, splitSortValue } from "../src/lib/api/sort";

describe("parseSortParam", () => {
  const allowed = ["deadline", "title"] as const;

  it("varsayılanı kullanır", () => {
    expect(parseSortParam(null, null, allowed, "deadline", "asc")).toEqual({
      field: "deadline",
      order: "asc",
    });
  });

  it("geçerli alan ve yönü parse eder", () => {
    expect(parseSortParam("title", "asc", allowed, "deadline", "desc")).toEqual({
      field: "title",
      order: "asc",
    });
  });

  it("geçersiz alanı varsayılana düşürür", () => {
    expect(parseSortParam("invalid", "asc", allowed, "deadline", "desc")).toEqual({
      field: "deadline",
      order: "asc",
    });
  });
});

describe("splitSortValue", () => {
  it("birleşik sort değerini ayırır", () => {
    expect(splitSortValue("deadline:asc")).toEqual({ sort: "deadline", order: "asc" });
    expect(splitSortValue("title:desc")).toEqual({ sort: "title", order: "desc" });
  });
});
