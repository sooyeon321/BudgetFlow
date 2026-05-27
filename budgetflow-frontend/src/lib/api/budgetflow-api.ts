import type {
  BudgetCategory,
  Expense,
  ExpenseStatus,
  ExpenseSummary,
  ExportJob,
  Project,
  TemplateMappingSuggestion,
  TemplateUploadResult,
} from "@/lib/domain";
import {
  budgetCategorySchema,
  budgetCategoryUpdateSchema,
  type BudgetCategoryInput,
  type BudgetCategoryUpdateInput,
} from "@/lib/forms/budget-category";
import {
  expenseRejectSchema,
  expenseReviewSchema,
  type ExpenseRejectInput,
  type ExpenseReviewInput,
} from "@/lib/forms/expense-review";
import { createProjectSchema, type CreateProjectInput } from "@/lib/forms/project";
import {
  projectTemplateUploadSchema,
  templateMappingConfirmSchema,
  type ProjectTemplateUploadInput,
  type TemplateMappingConfirmInput,
} from "@/lib/forms/template";

import {
  mockBudgetCategories,
  mockExpenses,
  mockExportJobs,
  mockProjects,
} from "./mock-data";

type GetExpensesParams = {
  projectId: string;
  status?: ExpenseStatus | "all";
};

const mockTemplateMappings = new Map<string, TemplateMappingSuggestion[]>();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function byNewestCreatedAt<T extends { createdAt: string }>(a: T, b: T) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

function normalizeSlackChannelName(slackChannelName: string) {
  return slackChannelName.trim().replace(/^#/, "");
}

function approvedExpensesForProject(projectId: string) {
  return mockExpenses.filter(
    (expense) =>
      expense.projectId === projectId &&
      (expense.status === "approved" || expense.status === "exported"),
  );
}

function expensesForProject(projectId: string) {
  return mockExpenses.filter((expense) => expense.projectId === projectId);
}

function approvedAmountByCategory(projectId: string) {
  return approvedExpensesForProject(projectId).reduce(
    (amountByCategory, expense) =>
      amountByCategory.set(
        expense.categoryId,
        (amountByCategory.get(expense.categoryId) ?? 0) + expense.amount,
      ),
    new Map<string, number>(),
  );
}

function findExpenseIndex(expenseId: string) {
  const expenseIndex = mockExpenses.findIndex((expense) => expense.id === expenseId);

  if (expenseIndex < 0) {
    throw new Error("지출 항목을 찾을 수 없습니다.");
  }

  return expenseIndex;
}

function findProjectIndex(projectId: string) {
  const projectIndex = mockProjects.findIndex((project) => project.id === projectId);

  if (projectIndex < 0) {
    throw new Error("프로젝트를 찾을 수 없습니다.");
  }

  return projectIndex;
}

function findBudgetCategoryIndex(categoryId: string) {
  const categoryIndex = mockBudgetCategories.findIndex(
    (category) => category.id === categoryId,
  );

  if (categoryIndex < 0) {
    throw new Error("예산 카테고리를 찾을 수 없습니다.");
  }

  return categoryIndex;
}

function normalizeKeywords(keywords: string[]) {
  return Array.from(
    new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean)),
  );
}

function hydrateBudgetCategory(
  category: (typeof mockBudgetCategories)[number],
  approvedAmounts = approvedAmountByCategory(category.projectId),
): BudgetCategory {
  const approvedAmount = approvedAmounts.get(category.id) ?? 0;

  return {
    ...category,
    approvedAmount,
    remainingAmount: category.budgetLimit - approvedAmount,
    usageRate:
      category.budgetLimit === 0
        ? 0
        : Math.round((approvedAmount / category.budgetLimit) * 1000) / 10,
  };
}

function createMockMappingSuggestions(): TemplateMappingSuggestion[] {
  return [
    {
      sourceColumn: "사용일자",
      targetField: "date",
      confidence: 0.94,
      confirmed: false,
    },
    {
      sourceColumn: "사용처",
      targetField: "merchant",
      confidence: 0.9,
      confirmed: false,
    },
    {
      sourceColumn: "내용",
      targetField: "description",
      confidence: 0.86,
      confirmed: false,
    },
    {
      sourceColumn: "예산항목",
      targetField: "category",
      confidence: 0.88,
      confirmed: false,
    },
    {
      sourceColumn: "금액",
      targetField: "amount",
      confidence: 0.97,
      confirmed: false,
    },
    {
      sourceColumn: "결제자",
      targetField: "payerName",
      confidence: 0.82,
      confirmed: false,
    },
    {
      sourceColumn: "증빙",
      targetField: "evidence",
      confidence: 0.76,
      confirmed: false,
    },
  ];
}

export async function getProjects(): Promise<Project[]> {
  const projects = [...mockProjects].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "active" ? -1 : 1;
    }

    return byNewestCreatedAt(a, b);
  });

  return clone(projects);
}

export async function getProject(projectId: string): Promise<Project | null> {
  return clone(mockProjects.find((project) => project.id === projectId) ?? null);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const result = createProjectSchema.safeParse(input);

  if (!result.success) {
    throw new Error("프로젝트 생성 입력이 올바르지 않습니다.");
  }

  const now = new Date().toISOString();
  const slackChannelName = normalizeSlackChannelName(
    result.data.slackChannelName,
  );
  const project: Project = {
    id: `project-${Date.now().toString(36)}`,
    organizationId: result.data.organizationId,
    name: result.data.name.trim(),
    totalBudget: result.data.totalBudget,
    status: "active",
    slackChannelId: `C-MOCK-${slackChannelName.toUpperCase()}`,
    slackChannelName,
    templateFileName: result.data.templateFileName?.trim() || null,
    templateMappingStatus: result.data.templateFileName?.trim()
      ? "suggested"
      : "none",
    createdAt: now,
    closedAt: null,
  };

  mockProjects.push(project);

  return clone(project);
}

export async function closeProject(projectId: string): Promise<Project> {
  const projectIndex = findProjectIndex(projectId);
  const project: Project = {
    ...mockProjects[projectIndex],
    status: "closed",
    closedAt: new Date().toISOString(),
  };

  mockProjects[projectIndex] = project;

  return clone(project);
}

export async function uploadProjectTemplate(
  input: ProjectTemplateUploadInput,
): Promise<TemplateUploadResult> {
  const result = projectTemplateUploadSchema.safeParse(input);

  if (!result.success) {
    throw new Error("엑셀 양식 업로드 입력이 올바르지 않습니다.");
  }

  const projectIndex = findProjectIndex(result.data.projectId);
  const fileName = result.data.fileName.trim();
  const mappings = createMockMappingSuggestions();
  const project: Project = {
    ...mockProjects[projectIndex],
    templateFileName: fileName,
    templateMappingStatus: "suggested",
  };

  mockProjects[projectIndex] = project;
  mockTemplateMappings.set(project.id, mappings);

  return clone({
    projectId: project.id,
    fileName,
    uploadStatus: "uploaded",
    mappingStatus: "suggested",
    mappings,
  });
}

export async function confirmTemplateMapping(
  input: TemplateMappingConfirmInput,
): Promise<TemplateUploadResult> {
  const result = templateMappingConfirmSchema.safeParse(input);

  if (!result.success) {
    throw new Error("엑셀 컬럼 매핑 입력이 올바르지 않습니다.");
  }

  const projectIndex = findProjectIndex(result.data.projectId);
  const project = mockProjects[projectIndex];
  const mappings = result.data.mappings.map((mapping) => ({
    ...mapping,
    confirmed: true,
  }));
  const updatedProject: Project = {
    ...project,
    templateMappingStatus: "confirmed",
  };

  mockProjects[projectIndex] = updatedProject;
  mockTemplateMappings.set(project.id, mappings);

  return clone({
    projectId: project.id,
    fileName: project.templateFileName ?? "template.xlsx",
    uploadStatus: "uploaded",
    mappingStatus: "confirmed",
    mappings,
  });
}

export async function getExpenses({
  projectId,
  status = "all",
}: GetExpensesParams): Promise<Expense[]> {
  const expenses = mockExpenses
    .filter((expense) => expense.projectId === projectId)
    .filter((expense) => status === "all" || expense.status === status)
    .sort(byNewestCreatedAt);

  return clone(expenses);
}

export async function approveExpense(
  input: ExpenseReviewInput,
): Promise<Expense> {
  const result = expenseReviewSchema.safeParse(input);

  if (!result.success) {
    throw new Error("지출 검토 입력이 올바르지 않습니다.");
  }

  const expenseIndex = findExpenseIndex(result.data.expenseId);
  const current = mockExpenses[expenseIndex];
  const updated: Expense = {
    ...current,
    date: result.data.date,
    amount: result.data.amount,
    categoryId: result.data.categoryId,
    description: result.data.description.trim(),
    status: "approved",
    reviewReason: null,
    missingFields: current.missingFields.filter(
      (field) => field !== "reviewRequired",
    ),
    updatedAt: new Date().toISOString(),
  };

  mockExpenses[expenseIndex] = updated;

  return clone(updated);
}

export async function rejectExpense(input: ExpenseRejectInput): Promise<Expense> {
  const result = expenseRejectSchema.safeParse(input);

  if (!result.success) {
    throw new Error("지출 반려 입력이 올바르지 않습니다.");
  }

  const expenseIndex = findExpenseIndex(result.data.expenseId);
  const updated: Expense = {
    ...mockExpenses[expenseIndex],
    status: "rejected",
    reviewReason: result.data.reason?.trim() || "관리자 반려",
    updatedAt: new Date().toISOString(),
  };

  mockExpenses[expenseIndex] = updated;

  return clone(updated);
}

export async function getExpenseSummary(
  projectId: string,
): Promise<ExpenseSummary> {
  const summary = expensesForProject(projectId).reduce(
    (accumulator, expense) => {
      accumulator.totalExpenseCount += 1;

      if (expense.status === "needs_review") {
        accumulator.needsReviewCount += 1;
      }

      if (expense.status === "approved") {
        accumulator.approvedCount += 1;
      }

      if (expense.status === "rejected") {
        accumulator.rejectedCount += 1;
      }

      if (expense.evidenceStatus === "none") {
        accumulator.missingEvidenceCount += 1;
      }

      if (expense.status === "approved" || expense.status === "exported") {
        accumulator.approvedAmount += expense.amount;
      }

      return accumulator;
    },
    {
      projectId,
      totalExpenseCount: 0,
      needsReviewCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      missingEvidenceCount: 0,
      approvedAmount: 0,
    } satisfies ExpenseSummary,
  );

  return {
    ...summary,
    projectId,
  };
}

export async function getBudgetCategories(
  projectId: string,
): Promise<BudgetCategory[]> {
  const approvedAmounts = approvedAmountByCategory(projectId);
  const categories = mockBudgetCategories
    .filter((category) => category.projectId === projectId)
    .map((category) => hydrateBudgetCategory(category, approvedAmounts));

  return clone(categories);
}

export async function createBudgetCategory(
  input: BudgetCategoryInput,
): Promise<BudgetCategory> {
  const result = budgetCategorySchema.safeParse(input);

  if (!result.success) {
    throw new Error("예산 카테고리 입력이 올바르지 않습니다.");
  }

  findProjectIndex(result.data.projectId);

  const category = {
    id: `cat-${Date.now().toString(36)}`,
    projectId: result.data.projectId,
    name: result.data.name.trim(),
    budgetLimit: result.data.budgetLimit,
    keywords: normalizeKeywords(result.data.keywords),
    createdAt: new Date().toISOString(),
  };

  mockBudgetCategories.push(category);

  return clone(hydrateBudgetCategory(category));
}

export async function updateBudgetCategory(
  input: BudgetCategoryUpdateInput,
): Promise<BudgetCategory> {
  const result = budgetCategoryUpdateSchema.safeParse(input);

  if (!result.success) {
    throw new Error("예산 카테고리 입력이 올바르지 않습니다.");
  }

  const categoryIndex = findBudgetCategoryIndex(result.data.categoryId);
  const current = mockBudgetCategories[categoryIndex];
  const category = {
    ...current,
    name: result.data.name.trim(),
    budgetLimit: result.data.budgetLimit,
    keywords: normalizeKeywords(result.data.keywords),
  };

  mockBudgetCategories[categoryIndex] = category;

  return clone(hydrateBudgetCategory(category));
}

export async function getExportJobs(projectId: string): Promise<ExportJob[]> {
  return clone(
    mockExportJobs
      .filter((exportJob) => exportJob.projectId === projectId)
      .sort(byNewestCreatedAt),
  );
}

export async function requestExpenseReportExport(
  projectId: string,
): Promise<ExportJob> {
  findProjectIndex(projectId);

  const expenses = mockExpenses.filter((expense) => expense.projectId === projectId);
  const includedExpenseCount = expenses.filter(
    (expense) => expense.status === "approved" || expense.status === "exported",
  ).length;
  const excludedReviewCount = expenses.filter(
    (expense) => expense.status === "needs_review",
  ).length;
  const now = new Date();
  const exportJob: ExportJob = {
    id: `export-${Date.now().toString(36)}`,
    projectId,
    type: "expense_report",
    status: "completed",
    includedExpenseCount,
    excludedReviewCount,
    downloadUrl: `https://example.com/mock/${projectId}-expense-report.xlsx`,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now.toISOString(),
  };

  mockExportJobs.push(exportJob);

  return clone(exportJob);
}
