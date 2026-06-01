// BudgetFlow LLM — 신뢰도 계산 및 판정 로직
// LLM이 반환한 confidence 객체를 받아
// aiConfidence, missingFields, needsReview, reviewReason을 계산합니다.

import { MissingFieldSchema } from "./BudgetFlow_LLM_Lambda_zod_schema";
import { z } from "zod";

type MissingField = z.infer<typeof MissingFieldSchema>;

interface LLMConfidence {
  date: boolean;
  amount: boolean;
  category: boolean;
  payerName: boolean;
}

interface LLMRawOutput {
  date: string | null;
  amount: number | null;
  merchant: string | null;
  description: string;
  categoryId: string | null;
  payerName: string | null;
  confidence: LLMConfidence;
}

interface ConfidenceResult {
  aiConfidence: number;
  missingFields: MissingField[];
  needsReview: boolean;
  reviewReason: string | null;
}

// ─────────────────────────────────────────
// 신뢰도 가산 점수 규칙 (스키마 문서 기준)
// ─────────────────────────────────────────
const CONFIDENCE_WEIGHTS = {
  date:       0.3,
  amount:     0.4,
  category:   0.2,
  payerName:  0.1,
} as const;

const CONFIDENCE_THRESHOLD = 0.7;

// ─────────────────────────────────────────
// 신뢰도 계산
// ─────────────────────────────────────────
export function calcTextParseConfidence(raw: LLMRawOutput): ConfidenceResult {
  const { confidence } = raw;

  // aiConfidence 계산 (규칙 기반, 소수점 첫째 자리 반올림)
  const score =
    (confidence.date      ? CONFIDENCE_WEIGHTS.date      : 0) +
    (confidence.amount    ? CONFIDENCE_WEIGHTS.amount    : 0) +
    (confidence.category  ? CONFIDENCE_WEIGHTS.category  : 0) +
    (confidence.payerName ? CONFIDENCE_WEIGHTS.payerName : 0);

  const aiConfidence = Math.round(score * 10) / 10;

  // missingFields 수집
  const missingFields: MissingField[] = [];
  if (!confidence.date)      missingFields.push("date");
  if (!confidence.amount)    missingFields.push("amount");
  if (!raw.merchant)         missingFields.push("merchant");
  if (!confidence.category)  missingFields.push("category");
  if (!confidence.payerName) missingFields.push("payerName");
  missingFields.push("evidence"); // 텍스트 입력은 항상 증빙 없음

  // needsReview 판정
  const reasons: string[] = [];

  if (aiConfidence < CONFIDENCE_THRESHOLD) {
    reasons.push(`신뢰도 낮음 (${aiConfidence})`);
  }
  // 텍스트 입력은 증빙 없음으로 무조건 needs_review
  reasons.push("증빙 없음");

  if (!confidence.date)     reasons.push("사용일 미확인");
  if (!confidence.amount)   reasons.push("금액 미확인");
  if (!raw.merchant)        reasons.push("사용처 미확인");
  if (!confidence.category) reasons.push("카테고리 분류 실패");

  const needsReview = reasons.length > 0;
  const reviewReason = needsReview ? reasons.join(", ") : null;

  return { aiConfidence, missingFields, needsReview, reviewReason };
}

// ─────────────────────────────────────────
// amount null 여부 판정 (Expense 저장 전 체크)
// ─────────────────────────────────────────

/**
 * amount가 null이면 Expense를 저장하지 않고 봇 재입력 요청으로 처리합니다.
 * true 반환 시 호출부에서 재입력 요청 후 END 처리해야 합니다.
 */
export function shouldRequestReInput(raw: LLMRawOutput): boolean {
  return raw.amount === null;
}

// ─────────────────────────────────────────
// 사용 예시
// ─────────────────────────────────────────

/*
import { calcTextParseConfidence, shouldRequestReInput } from "./confidence";
import { safeParseTextOutput } from "./BudgetFlow_LLM_Lambda_zod_schema";

const llmRaw = JSON.parse(bedrockResponseText);

// 1. amount null 체크 → 재입력 요청
if (shouldRequestReInput(llmRaw)) {
  await sendReInputRequest(submittedBy.userId);
  return;
}

// 2. 신뢰도 계산
const { aiConfidence, missingFields, needsReview, reviewReason } =
  calcTextParseConfidence(llmRaw);

// 3. 최종 출력 객체 조립
const output = {
  inputType: "text",
  ...llmRaw,
  evidenceStatus: "none",
  evidenceFileId: null,
  aiConfidence,
  missingFields,
  needsReview,
  reviewReason,
  reviewCode: null,
  rawInput: originalText,
};

// 4. Zod 검증
const parsed = safeParseTextOutput(output);
if (!parsed) {
  await saveExpense({ ...fallback, needsReview: true, reviewReason: "LLM 출력 검증 실패" });
  return;
}

// 5. DB 저장
await saveExpense(parsed);
*/
