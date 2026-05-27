import { describe, expect, it } from "vitest";

import { parseKeywordsText } from "./budget-category";

describe("parseKeywordsText", () => {
  it("trims, deduplicates, and removes empty keywords", () => {
    expect(parseKeywordsText(" 간식, 커피, 간식, , 음료 ")).toEqual([
      "간식",
      "커피",
      "음료",
    ]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseKeywordsText(undefined)).toEqual([]);
    expect(parseKeywordsText("  , ")).toEqual([]);
  });
});
