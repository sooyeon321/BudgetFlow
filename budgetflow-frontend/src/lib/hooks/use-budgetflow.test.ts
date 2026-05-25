import { describe, expect, it } from "vitest";

import { budgetflowQueryKeys } from "./use-budgetflow";

describe("budgetflowQueryKeys", () => {
  it("keeps expense list filters under a project-level invalidation prefix", () => {
    expect(budgetflowQueryKeys.expensesByProject("project-a")).toEqual([
      "expenses",
      "project-a",
    ]);
    expect(budgetflowQueryKeys.expenses("project-a", "needs_review")).toEqual([
      "expenses",
      "project-a",
      "needs_review",
    ]);
  });
});
