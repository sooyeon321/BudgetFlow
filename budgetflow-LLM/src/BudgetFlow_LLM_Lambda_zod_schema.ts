// BudgetFlow LLM Lambda - Zod 스키마
// v4 출력 스키마 + 2026-05-27 회의 확정 사항 반영

import { z } from "zod";

// ─────────────────────────────────────────
// 공통 타입
// ─────────────────────────────────────────

const EvidenceStatusSchema = z.enum([
  "none",           // 증빙 없음 (텍스트 입력)
  "uploaded",       // 파일 업로드 완료
  "ocr_completed",  // Textract 호출 성공
  "ocr_failed",     // Textract 호출 실패
  "verified",       // 관리자 검증 완료
]);

/** app.ts 등에서 리터럴 대신 사용하는 상수 (API 명세서 EvidenceStatus 기준) */
export const EvidenceStatus = {
  NONE:          "none",
  UPLOADED:      "uploaded",
  OCR_COMPLETED: "ocr_completed",
  OCR_FAILED:    "ocr_failed",
  VERIFIED:      "verified",
} as const;

export const MissingFieldSchema = z.enum([
  "date",
  "amount",
  "merchant",
  "category",
  "payerName",
  "evidence", // 텍스트 파싱 전용
]);

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  keywords: z.array(z.string()),
});

const SubmittedBySchema = z.object({
  userId: z.string(),
  displayName: z.string(),
});

// ─────────────────────────────────────────
// 교차 검증 헬퍼 (superRefine 콜백 재사용)
// superRefine은 .extend() 후 붙여야 ZodObject 타입 유지됨
// ─────────────────────────────────────────

type BaseShape = {
  categoryId: string | null;
  categoryName: string | null;
  needsReview: boolean;
  reviewReason: string | null;
};

function crossFieldRefine(data: BaseShape, ctx: z.RefinementCtx) {
  if (data.categoryId === null && data.categoryName !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "categoryId가 null이면 categoryName도 null이어야 합니다.",
      path: ["categoryName"],
    });
  }
  if (!data.needsReview && data.reviewReason !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "needsReview가 false이면 reviewReason은 null이어야 합니다.",
      path: ["reviewReason"],
    });
  }
  if (data.needsReview && !data.reviewReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "needsReview가 true이면 reviewReason에 사유가 있어야 합니다.",
      path: ["reviewReason"],
    });
  }
}

// ─────────────────────────────────────────
// 공통 출력 베이스 (superRefine 없는 순수 ZodObject)
// ─────────────────────────────────────────

const BaseOutputSchema = z.object({
  date: z.string().nullable(),
  amount: z.number().int().nonnegative().nullable(), // 원 단위 정수, 음수 금지 (0 허용)
  merchant: z.string().nullable(),
  description: z.string(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  payerName: z.string().nullable(),
  evidenceStatus: EvidenceStatusSchema,
  evidenceFileId: z.string().nullable(),
  aiConfidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  missingFields: z.array(MissingFieldSchema),
  reviewReason: z.string().nullable(),
  reviewCode: z.string().nullable(),
});

// ─────────────────────────────────────────
// 1. 텍스트 파싱
// ─────────────────────────────────────────

export const TextParseInputSchema = z.object({
  inputType: z.literal("text"),
  text: z.string(),
  projectId: z.string(),
  requestDate: z.string(),
  timezone: z.string(),
  submittedBy: SubmittedBySchema,
  categories: z.array(CategorySchema),
});

export const TextParseOutputSchema = BaseOutputSchema.extend({
  inputType: z.literal("text"),
  evidenceStatus: z.literal("none"),
  evidenceFileId: z.null(),
  rawInput: z.string(),
}).superRefine(crossFieldRefine);

export type TextParseInput  = z.infer<typeof TextParseInputSchema>;
export type TextParseOutput = z.infer<typeof TextParseOutputSchema>;

// ─────────────────────────────────────────
// 2. 영수증 OCR
// ─────────────────────────────────────────

const ReceiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive().nullable(),
  unitPrice: z.number().int().nonnegative().nullable(),
  amount: z.number().int().nonnegative(),
});

export const OcrInputSchema = z.object({
  inputType: z.enum(["image", "text_image"]),
  s3Key: z.string(),
  projectId: z.string(),
  evidenceFileId: z.string(),
  submittedBy: SubmittedBySchema,
  categories: z.array(CategorySchema),
});

export const OcrOutputSchema = BaseOutputSchema.extend({
  inputType: z.enum(["image", "text_image"]),
  payerName: z.null(),
  evidenceFileId: z.string(),
  items: z.array(ReceiptItemSchema),
  // 회의 확정 (2026-05-27): 10KB 초과 시 ocrRawText = null + ocrRawTextS3Key에 S3 key
  ocrRawText: z.string().nullable(),
  ocrRawTextS3Key: z.string().nullable(),
}).superRefine(crossFieldRefine);

export type OcrInput  = z.infer<typeof OcrInputSchema>;
export type OcrOutput = z.infer<typeof OcrOutputSchema>;

// ─────────────────────────────────────────
// 유틸: 안전한 파싱
// ─────────────────────────────────────────

export function safeParseTextOutput(raw: unknown): TextParseOutput | null {
  const result = TextParseOutputSchema.safeParse(raw);
  if (result.success) return result.data;
  console.error("[TextParse] Zod 검증 실패:", result.error.issues);
  return null;
}

export function safeParseOcrOutput(raw: unknown): OcrOutput | null {
  const result = OcrOutputSchema.safeParse(raw);
  if (result.success) return result.data;
  console.error("[OCR] Zod 검증 실패:", result.error.issues);
  return null;
}
