import type { EvidenceStatus, ExpenseStatus } from "@/lib/domain";

export type StatusTone =
  | "default"
  | "approved"
  | "review"
  | "missing"
  | "processing"
  | "rejected"
  | "exported";

export const expenseStatusTone: Record<ExpenseStatus, StatusTone> = {
  approved: "approved",
  created: "default",
  exported: "exported",
  needs_review: "review",
  processing: "processing",
  rejected: "rejected",
};

export const evidenceStatusTone: Record<EvidenceStatus, StatusTone> = {
  none: "missing",
  ocr_completed: "processing",
  ocr_failed: "missing",
  uploaded: "default",
  verified: "approved",
};
