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
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/forms/project";
import {
  projectTemplateUploadSchema,
  templateMappingConfirmSchema,
  type ProjectTemplateUploadInput,
  type TemplateMappingConfirmInput,
} from "@/lib/forms/template";

import { downloadFile, http, isApiConfigured } from "./http-client";
import {
  mockBudgetCategories,
  mockExpenses,
  mockExportJobs,
  mockProjects,
} from "./mock-data";

// ─── 백엔드 응답 타입 (http-client camelizeKeys 적용 후 기준) ─────────────────

type BackendProject = {
  id: string;
  name: string;
  status: "active" | "closed";
  createdAt?: string;
  closedAt?: string;
  totalBudget?: number;
  organizationId?: string;
  slackChannelId?: string;
  slackChannelName?: string;
  templateFileName?: string;
  templateMappingStatus?: string;
};

type BackendExpense = {
  id: string;
  projectId?: string;
  amount: number;
  status: string;
  merchant: string;
  payerName: string;
  categoryId?: string;
  date?: string;
  description?: string;
  reviewReason?: string;
  evidenceStatus?: string;
  aiConfidence?: number;
  missingFields?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type BackendCategory = {
  id: string;
  name: string;
  budgetLimit?: number;
  projectId?: string;
  keywords?: string[];
  createdAt?: string;
  approvedAmount?: number | string;
  remainingAmount?: number | string;
  usageRate?: number | string;
};

type BackendExpenseSummary = {
  totalExpenseCount?: number;
  needsReviewCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  missingEvidenceCount?: number;
  approvedAmount?: number;
};

type BackendExportJob = {
  id?: string;
  jobId?: string;
  status: string;
  downloadUrl?: string;
  includedExpenseCount?: number | string;
  excludedReviewCount?: number | string;
  createdAt?: string;
};

// ─── 어댑터 ────────────────────────────────────────────────────────────────────

const FALLBACK_ORG_ID = "org_inha_cs_2026";

function toProject(r: BackendProject): Project {
  const now = new Date().toISOString();
  return {
    id: r.id,
    organizationId: r.organizationId ?? FALLBACK_ORG_ID,
    name: r.name,
    totalBudget: r.totalBudget ?? 0,
    status: r.status,
    slackChannelId: r.slackChannelId ?? "",
    slackChannelName: r.slackChannelName ?? "",
    templateFileName: r.templateFileName ?? null,
    templateMappingStatus:
      (r.templateMappingStatus as Project["templateMappingStatus"]) ?? "none",
    createdAt: r.createdAt ?? now,
    closedAt: r.closedAt ?? null,
  };
}

function toExpense(r: BackendExpense): Expense {
  const now = new Date().toISOString();
  return {
    id: r.id,
    projectId: r.projectId ?? "",
    categoryId: r.categoryId ?? "",
    date: r.date ?? now.slice(0, 10),
    amount: Number(r.amount),
    merchant: r.merchant,
    description: r.description ?? "",
    payerName: r.payerName,
    inputChannel: "slack",
    slackUserId: "",
    status: r.status as ExpenseStatus,
    evidenceStatus: (r.evidenceStatus as Expense["evidenceStatus"]) ?? "none",
    evidenceFileId: null,
    aiConfidence: Number(r.aiConfidence ?? 0),
    missingFields: r.missingFields ?? [],
    reviewReason: r.reviewReason ?? null,
    createdAt: r.createdAt ?? now,
    updatedAt: r.updatedAt ?? now,
  };
}

function toCategory(r: BackendCategory, projectId: string): BudgetCategory {
  const budgetLimit = Number(r.budgetLimit ?? 0);
  const approvedAmount = Number(r.approvedAmount ?? 0);
  const now = new Date().toISOString();
  return {
    id: r.id,
    projectId: r.projectId ?? projectId,
    name: r.name,
    budgetLimit,
    keywords: r.keywords ?? [],
    approvedAmount,
    remainingAmount: Number(r.remainingAmount ?? budgetLimit - approvedAmount),
    usageRate: Number(r.usageRate ?? 0),
    createdAt: r.createdAt ?? now,
  };
}

function toExpenseSummary(
  r: BackendExpenseSummary,
  projectId: string,
): ExpenseSummary {
  return {
    projectId,
    totalExpenseCount: Number(r.totalExpenseCount ?? 0),
    needsReviewCount: Number(r.needsReviewCount ?? 0),
    approvedCount: Number(r.approvedCount ?? 0),
    rejectedCount: Number(r.rejectedCount ?? 0),
    missingEvidenceCount: Number(r.missingEvidenceCount ?? 0),
    approvedAmount: Number(r.approvedAmount ?? 0),
  };
}

function toExportJob(r: BackendExportJob, projectId: string): ExportJob {
  const now = new Date().toISOString();
  return {
    id: r.id ?? r.jobId ?? `export-${Date.now()}`,
    projectId,
    type: "expense_report",
    status: r.status as ExportJob["status"],
    includedExpenseCount: Number(r.includedExpenseCount ?? 0),
    excludedReviewCount: Number(r.excludedReviewCount ?? 0),
    downloadUrl: r.downloadUrl ?? null,
    expiresAt: null,
    createdAt: r.createdAt ?? now,
  };
}

// ─── Mock 헬퍼 ────────────────────────────────────────────────────────────────

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
  const expenseIndex = mockExpenses.findIndex(
    (expense) => expense.id === expenseId,
  );
  if (expenseIndex < 0) throw new Error("지출 항목을 찾을 수 없습니다.");
  return expenseIndex;
}

function findProjectIndex(projectId: string) {
  const projectIndex = mockProjects.findIndex(
    (project) => project.id === projectId,
  );
  if (projectIndex < 0) throw new Error("프로젝트를 찾을 수 없습니다.");
  return projectIndex;
}

function findBudgetCategoryIndex(categoryId: string) {
  const categoryIndex = mockBudgetCategories.findIndex(
    (category) => category.id === categoryId,
  );
  if (categoryIndex < 0) throw new Error("예산 카테고리를 찾을 수 없습니다.");
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

// ─── API 함수 ─────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  if (isApiConfigured) {
    const raw = await http.get<BackendProject[]>("/api/projects");
    return raw.map(toProject).sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return byNewestCreatedAt(a, b);
    });
  }

  const projects = [...mockProjects].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return byNewestCreatedAt(a, b);
  });
  return clone(projects);
}

export async function getProject(projectId: string): Promise<Project | null> {
  if (isApiConfigured) {
    const raw = await http.get<BackendProject>(`/api/projects/${projectId}`);
    return toProject(raw);
  }
  return clone(
    mockProjects.find((project) => project.id === projectId) ?? null,
  );
}

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  const result = createProjectSchema.safeParse(input);
  if (!result.success)
    throw new Error("프로젝트 생성 입력이 올바르지 않습니다.");

  if (isApiConfigured) {
    const raw = await http.post<BackendProject>("/api/projects", {
      name: result.data.name.trim(),
      totalBudget: result.data.totalBudget,
      slackChannelName: normalizeSlackChannelName(result.data.slackChannelName),
      templateFileName: result.data.templateFileName?.trim() || null,
    });
    return toProject(raw);
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
  if (isApiConfigured) {
    const raw = await http.post<BackendProject>(
      `/api/projects/${projectId}/close`,
      {},
    );
    return toProject(raw);
  }

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
  if (!result.success)
    throw new Error("엑셀 양식 업로드 입력이 올바르지 않습니다.");

  if (isApiConfigured) {
    await http.post(`/api/projects/${result.data.projectId}/template`, {
      fileName: result.data.fileName.trim(),
    });
    const mappings = createMockMappingSuggestions();
    return clone({
      projectId: result.data.projectId,
      fileName: result.data.fileName.trim(),
      uploadStatus: "uploaded" as const,
      mappingStatus: "suggested" as const,
      mappings,
    });
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
    uploadStatus: "uploaded" as const,
    mappingStatus: "suggested" as const,
    mappings,
  });
}

export async function confirmTemplateMapping(
  input: TemplateMappingConfirmInput,
): Promise<TemplateUploadResult> {
  const result = templateMappingConfirmSchema.safeParse(input);
  if (!result.success)
    throw new Error("엑셀 컬럼 매핑 입력이 올바르지 않습니다.");

  if (isApiConfigured) {
    await http.patch(
      `/api/projects/${result.data.projectId}/template-mapping`,
      {
        mappings: result.data.mappings,
      },
    );
    const mappings = result.data.mappings.map((m) => ({
      ...m,
      confirmed: true,
    }));
    return clone({
      projectId: result.data.projectId,
      fileName: "template.xlsx",
      uploadStatus: "uploaded" as const,
      mappingStatus: "confirmed" as const,
      mappings,
    });
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
    uploadStatus: "uploaded" as const,
    mappingStatus: "confirmed" as const,
    mappings,
  });
}

export async function getExpenses({
  projectId,
  status = "all",
}: GetExpensesParams): Promise<Expense[]> {
  if (isApiConfigured) {
    const params = new URLSearchParams({ projectId });
    if (status !== "all") params.set("status", status);
    const raw = await http.get<BackendExpense[]>(`/api/expenses?${params}`);
    return raw.map(toExpense).sort(byNewestCreatedAt);
  }

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
  if (!result.success) throw new Error("지출 검토 입력이 올바르지 않습니다.");

  if (isApiConfigured) {
    const raw = await http.patch<BackendExpense>(
      `/api/expenses/${result.data.expenseId}/approve`,
      {
        date: result.data.date,
        amount: result.data.amount,
        categoryId: result.data.categoryId,
        description: result.data.description.trim(),
      },
    );
    return toExpense(raw);
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

export async function rejectExpense(
  input: ExpenseRejectInput,
): Promise<Expense> {
  const result = expenseRejectSchema.safeParse(input);
  if (!result.success) throw new Error("지출 반려 입력이 올바르지 않습니다.");

  if (isApiConfigured) {
    const raw = await http.patch<BackendExpense>(
      `/api/expenses/${result.data.expenseId}/reject`,
      { reason: result.data.reason?.trim() || "관리자 반려" },
    );
    return toExpense(raw);
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
  if (isApiConfigured) {
    const raw = await http.get<BackendExpenseSummary>(
      `/api/expenses/summary?projectId=${projectId}`,
    );
    return toExpenseSummary(raw, projectId);
  }

  const summary = expensesForProject(projectId).reduce(
    (accumulator, expense) => {
      accumulator.totalExpenseCount += 1;
      if (expense.status === "needs_review") accumulator.needsReviewCount += 1;
      if (expense.status === "approved") accumulator.approvedCount += 1;
      if (expense.status === "rejected") accumulator.rejectedCount += 1;
      if (expense.evidenceStatus === "none")
        accumulator.missingEvidenceCount += 1;
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
  return { ...summary, projectId };
}

export async function getBudgetCategories(
  projectId: string,
): Promise<BudgetCategory[]> {
  if (isApiConfigured) {
    const raw = await http.get<BackendCategory[]>(
      `/api/budget-categories?projectId=${projectId}`,
    );
    return raw.map((r) => toCategory(r, projectId));
  }

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
  if (!result.success)
    throw new Error("예산 카테고리 입력이 올바르지 않습니다.");

  if (isApiConfigured) {
    const raw = await http.post<BackendCategory>("/api/budget-categories", {
      projectId: result.data.projectId,
      name: result.data.name.trim(),
      budgetLimit: result.data.budgetLimit,
      keywords: normalizeKeywords(result.data.keywords),
    });
    return toCategory(raw, result.data.projectId);
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
  if (!result.success)
    throw new Error("예산 카테고리 입력이 올바르지 않습니다.");

  if (isApiConfigured) {
    const raw = await http.patch<BackendCategory>(
      `/api/budget-categories/${result.data.categoryId}`,
      {
        name: result.data.name.trim(),
        budgetLimit: result.data.budgetLimit,
        keywords: normalizeKeywords(result.data.keywords),
      },
    );
    return toCategory({ ...raw, id: result.data.categoryId }, "");
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
  if (isApiConfigured) {
    const raw = await http.get<BackendExportJob[]>(
      `/api/projects/${projectId}/exports`,
    );
    return raw.map((r) => toExportJob(r, projectId)).sort(byNewestCreatedAt);
  }

  return clone(
    mockExportJobs
      .filter((exportJob) => exportJob.projectId === projectId)
      .sort(byNewestCreatedAt),
  );
}

export async function requestExpenseReportExport(
  projectId: string,
): Promise<ExportJob> {
  if (isApiConfigured) {
    await downloadFile(
      `/api/projects/${projectId}/exports/expense-report`,
      `expense-report-${projectId}.xlsx`,
    );
    const now = new Date().toISOString();
    return {
      id: `export-${Date.now()}`,
      projectId,
      type: "expense_report",
      status: "completed",
      includedExpenseCount: 0,
      excludedReviewCount: 0,
      downloadUrl: null,
      expiresAt: null,
      createdAt: now,
    };
  }

  findProjectIndex(projectId);
  const expenses = mockExpenses.filter(
    (expense) => expense.projectId === projectId,
  );
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
