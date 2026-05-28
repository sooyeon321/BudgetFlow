// BudgetFlow LLM Lambda - Zod 스키마
// v4 출력 스키마 + 2026-05-27 회의 확정 사항 반영
// 변경 이력:
//   - EvidenceStatusSchema: uploaded, verified 추가 (API 명세서 기준)
//   - EvidenceStatus 상수 export 추가 (app.ts import 대응)
//   - amount: .positive() → .nonnegative() (0원 허용, 명세서 기준)
//   - OcrInputSchema.inputType: "image" | "text_image" (text_image 타입 추가)
//   - OcrOutputSchema: ocrRawText nullable + ocrRawTextS3Key 추가 (10KB 초과 시 S3 분리 저장)

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

const MissingFieldSchema = z.enum([
  "date",
  "amount",
  "merchant",
  "category",
  "payerName",
  "evidence", // 텍스트 파싱 전용
]);

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  keywords: z.array(z.string()),
});

const SubmittedBySchema = z.object({
  userId: z.string(),
  displayName: z.string(),
});

// ─────────────────────────────────────────
// 공통 출력 필드
// ─────────────────────────────────────────

const BaseOutputSchema = z.object({
  date: z.string().nullable(),           // YYYY-MM-DD
  amount: z.number().int().nonnegative().nullable(), // 원 단위 정수, 음수 금지 (0 허용)
  merchant: z.string().nullable(),
  description: z.string(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),   // categoryId null이면 반드시 null
  payerName: z.string().nullable(),
  evidenceStatus: EvidenceStatusSchema,
  evidenceFileId: z.string().nullable(),
  aiConfidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  missingFields: z.array(MissingFieldSchema),
  reviewReason: z.string().nullable(),   // needsReview=false면 반드시 null
  reviewCode: z.string().nullable(),     // MVP는 항상 null. 추후 확장용 optional
}).superRefine((data, ctx) => {

  // categoryId / categoryName 동기화 검증
  if (data.categoryId === null && data.categoryName !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "categoryId가 null이면 categoryName도 null이어야 합니다.",
      path: ["categoryName"],
    });
  }

  // reviewReason / needsReview 동기화 검증
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

});

// ─────────────────────────────────────────
// 1. 텍스트 파싱 Lambda
// ─────────────────────────────────────────

/** 입력 스키마 */
export const TextParseInputSchema = z.object({
  inputType: z.literal("text"),
  text: z.string(),
  projectId: z.string(),
  requestDate: z.string(), // YYYY-MM-DD
  timezone: z.string(),    // e.g. "Asia/Seoul"
  submittedBy: SubmittedBySchema,
  categories: z.array(CategorySchema),
});

/** 출력 스키마 */
export const TextParseOutputSchema = BaseOutputSchema.extend({
  inputType: z.literal("text"),
  evidenceStatus: z.literal("none"),  // 텍스트 입력은 항상 none
  evidenceFileId: z.null(),           // 텍스트 입력은 항상 null
  rawInput: z.string(),               // 원문 보존
});

export type TextParseInput = z.infer<typeof TextParseInputSchema>;
export type TextParseOutput = z.infer<typeof TextParseOutputSchema>;

// ─────────────────────────────────────────
// 2. 영수증 OCR Lambda
// ─────────────────────────────────────────

const ReceiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive().nullable(),
  unitPrice: z.number().int().nonnegative().nullable(),
  amount: z.number().int().nonnegative(),
});

/** 입력 스키마 */
export const OcrInputSchema = z.object({
  inputType: z.enum(["image", "text_image"]), // text_image: 텍스트 + 이미지 동시 입력
  s3Key: z.string(),
  projectId: z.string(),
  evidenceFileId: z.string(),
  submittedBy: SubmittedBySchema,
  categories: z.array(CategorySchema),
});

/** 출력 스키마 */
export const OcrOutputSchema = BaseOutputSchema.extend({
  inputType: z.enum(["image", "text_image"]),
  payerName: z.null(),                        // 영수증에서 추출 불가. 항상 null
  evidenceFileId: z.string(),                 // OCR은 항상 존재
  items: z.array(ReceiptItemSchema),
  // 회의 확정 (2026-05-27): 10KB 이하는 ocrRawText에 포함, 초과 시 ocrRawText = null + ocrRawTextS3Key에 S3 key 전달
  ocrRawText: z.string().nullable(),
  ocrRawTextS3Key: z.string().nullable(),     // ocrRawText 10KB 초과 시 S3 key. 이 경우 ocrRawText = null
});

export type OcrInput = z.infer<typeof OcrInputSchema>;
export type OcrOutput = z.infer<typeof OcrOutputSchema>;

// ─────────────────────────────────────────
// 유틸 함수: 안전한 파싱 + 실패 시 needsReview 보장
// ─────────────────────────────────────────

/**
 * LLM/OCR 결과를 Zod로 검증합니다.
 * 검증 실패 시 needsReview = true, reviewReason에 에러 메시지를 담은
 * fallback 객체를 반환합니다. (Lambda가 에러 없이 계속 진행 가능)
 */
export function safeParseTextOutput(raw: unknown): TextParseOutput | null {
  const result = TextParseOutputSchema.safeParse(raw);
  if (result.success) return result.data;

  console.error("[TextParse] Zod 검증 실패:", result.error.issues);
  return null; // 호출부에서 needsReview=true fallback 처리
}

export function safeParseOcrOutput(raw: unknown): OcrOutput | null {
  const result = OcrOutputSchema.safeParse(raw);
  if (result.success) return result.data;

  console.error("[OCR] Zod 검증 실패:", result.error.issues);
  return null; // 호출부에서 needsReview=true fallback 처리
}

// ─────────────────────────────────────────
// 사용 예시
// ─────────────────────────────────────────

/*
import { safeParseTextOutput } from "./schemas";

const raw = JSON.parse(llmResponseText);
const parsed = safeParseTextOutput(raw);

if (!parsed) {
  // Zod 검증 실패 → needsReview=true로 저장
  await saveExpense({ ...fallback, needsReview: true, reviewReason: "LLM 출력 검증 실패" });
  return;
}

if (parsed.amount === null) {
  // amount 누락 → Expense 미저장, 봇에 재입력 요청
  await requestReInput(parsed.rawInput);
  return;
}

// 정상 처리
await saveExpense(parsed);
*/
