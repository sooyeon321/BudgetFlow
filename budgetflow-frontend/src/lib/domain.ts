export type ProjectStatus = "active" | "closed";

export type ExpenseStatus =
  | "created"
  | "processing"
  | "needs_review"
  | "approved"
  | "rejected"
  | "exported";

export type EvidenceStatus =
  | "none"
  | "uploaded"
  | "ocr_completed"
  | "ocr_failed"
  | "verified";

export type ExportStatus =
  | "requested"
  | "generating"
  | "completed"
  | "failed"
  | "expired";

export type TemplateMappingStatus = "none" | "suggested" | "confirmed";

export type TemplateField =
  | "date"
  | "merchant"
  | "description"
  | "category"
  | "amount"
  | "payerName"
  | "evidence";

export type Organization = {
  id: string;
  name: string;
  slackWorkspaceId: string;
  createdAt: string;
};

export type Project = {
  id: string;
  organizationId: string;
  name: string;
  totalBudget: number;
  status: ProjectStatus;
  slackChannelId: string;
  slackChannelName: string;
  templateFileName: string | null;
  templateMappingStatus: TemplateMappingStatus;
  createdAt: string;
  closedAt: string | null;
};

export type BudgetCategory = {
  id: string;
  projectId: string;
  name: string;
  budgetLimit: number;
  keywords: string[];
  approvedAmount: number;
  remainingAmount: number;
  usageRate: number;
  createdAt: string;
};

export type BudgetCategoryRecord = Omit<
  BudgetCategory,
  "approvedAmount" | "remainingAmount" | "usageRate"
>;

export type EvidenceFile = {
  id: string;
  projectId: string;
  expenseId: string;
  fileName: string;
  fileType: "image" | "pdf" | "xlsx";
  url: string;
  ocrStatus: EvidenceStatus;
  createdAt: string;
};

export type Expense = {
  id: string;
  projectId: string;
  categoryId: string;
  date: string;
  amount: number;
  merchant: string;
  description: string;
  payerName: string;
  inputChannel: "slack";
  slackUserId: string;
  status: ExpenseStatus;
  evidenceStatus: EvidenceStatus;
  evidenceFileId: string | null;
  aiConfidence: number;
  missingFields: string[];
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExportJob = {
  id: string;
  projectId: string;
  type: "budget_plan" | "expense_report";
  status: ExportStatus;
  includedExpenseCount: number;
  excludedReviewCount: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type ExpenseSummary = {
  projectId: string;
  totalExpenseCount: number;
  needsReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  missingEvidenceCount: number;
  approvedAmount: number;
};

export type TemplateMappingSuggestion = {
  sourceColumn: string;
  targetField: TemplateField;
  confidence: number;
  confirmed: boolean;
};

export type TemplateUploadResult = {
  projectId: string;
  fileName: string;
  uploadStatus: "uploaded";
  mappingStatus: Exclude<TemplateMappingStatus, "none">;
  mappings: TemplateMappingSuggestion[];
};
