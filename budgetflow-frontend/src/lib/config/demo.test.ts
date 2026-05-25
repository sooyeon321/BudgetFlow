import { describe, expect, it } from "vitest";

import {
  getBudgetCategories,
  getExpenses,
  getProject,
} from "@/lib/api/budgetflow-api";
import { DEMO_ORGANIZATION_ID, DEMO_PROJECT_ID } from "./demo";

describe("demo config", () => {
  it("points to seeded mock project data used by dashboard pages", async () => {
    const project = await getProject(DEMO_PROJECT_ID);
    const expenses = await getExpenses({ projectId: DEMO_PROJECT_ID });
    const categories = await getBudgetCategories(DEMO_PROJECT_ID);

    expect(DEMO_ORGANIZATION_ID).toBe("org-gdgoc");
    expect(project).toMatchObject({ id: DEMO_PROJECT_ID, status: "active" });
    expect(expenses.length).toBeGreaterThan(0);
    expect(categories.length).toBeGreaterThan(0);
  });
});
