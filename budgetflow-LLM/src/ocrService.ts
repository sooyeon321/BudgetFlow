// BudgetFlow LLM Service - OCR 서비스
// Textract 결과 → Bedrock 정제 → 신뢰도 계산 → OcrOutput 조립

import { analyzeExpense } from "./textractClient";
import { buildOcrPrompt } from "./promptBuilder";
import { callBedrock } from "./bedrockClient";
import { EvidenceStatus, MissingFieldSchema } from "./BudgetFlow_LLM_Lambda_zod_schema";
import type { OcrInput, OcrOutput } from "./BudgetFlow_LLM_Lambda_zod_schema";
import { z } from "zod";

type MissingField = z.infer<typeof MissingFieldSchema>;

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.7;
const OCR_RAW_TEXT_SIZE_LIMIT = 10 * 1024; // 10KB

// ─────────────────────────────────────────
// 신뢰도 계산 (스키마 문서 기준)
// ─────────────────────────────────────────

interface LLMOcrRaw {
  date: string | null;
  merchant: string | null;
  amount: number | null;
  description: string;
  categoryId: string | null;
  items: Array<{
    name: string;
    quantity: number | null;
    unitPrice: number | null;
    amount: number;
  }>;
  confidence: {
    date: boolean;
    merchant: boolean;
    amount: boolean;
    items: boolean;
    category: boolean;
  };
}

interface OcrConfidenceResult {
  aiConfidence: number;
  missingFields: MissingField[];
  needsReview: boolean;
  reviewReason: string | null;
}

function calcOcrConfidence(llm: LLMOcrRaw): OcrConfidenceResult {
  const { confidence } = llm;

  // 신뢰도 계산
  let score =
    (confidence.date     ? 0.2 : 0) +
    (confidence.merchant ? 0.2 : 0) +
    (confidence.amount   ? 0.3 : 0) +
    (confidence.items    ? 0.2 : 0) +
    (confidence.category ? 0.1 : 0);

  // items 추출 실패 시 상한 0.8
  if (!confidence.items) {
    score = Math.min(score, 0.8);
  }

  const aiConfidence = Math.round(score * 10) / 10;

  // missingFields 수집
  const missingFields: MissingField[] = [];
  if (!confidence.date)     missingFields.push("date");
  if (!llm.merchant)        missingFields.push("merchant");
  if (!confidence.amount)   missingFields.push("amount");
  if (!confidence.category) missingFields.push("category");

  // needsReview 판정
  const reasons: string[] = [];

  if (aiConfidence < CONFIDENCE_THRESHOLD) reasons.push(`신뢰도 낮음 (${aiConfidence})`);
  if (!confidence.amount)                  reasons.push("금액 미확인");
  if (!confidence.date)                    reasons.push("사용일 미확인");
  if (!llm.merchant)                       reasons.push("사용처 미확인");
  if (!confidence.category)                reasons.push("카테고리 분류 실패");

  // items 합계 ≠ amount 오차 5% 초과 체크
  if (llm.amount && llm.items.length > 0) {
    const itemsTotal = llm.items.reduce((sum, item) => sum + item.amount, 0);
    const diff = Math.abs(itemsTotal - llm.amount) / llm.amount;
    if (diff > 0.05) {
      reasons.push(`품목 합계(${itemsTotal}원)와 영수증 합계(${llm.amount}원) 불일치`);
    }
  }

  const needsReview = reasons.length > 0;
  const reviewReason = needsReview ? reasons.join(", ") : null;

  return { aiConfidence, missingFields, needsReview, reviewReason };
}

// ─────────────────────────────────────────
// description 자동 생성
// ─────────────────────────────────────────

function buildDescription(merchant: string | null, date: string | null): string {
  if (merchant) return `${merchant} 영수증`;
  if (date)     return `영수증 ${date}`;
  return "영수증";
}

// ─────────────────────────────────────────
// ocrRawText 크기 처리 (10KB 초과 시 S3 분리)
// ─────────────────────────────────────────

function handleRawText(rawText: string): { ocrRawText: string | null; ocrRawTextS3Key: string | null } {
  const byteSize = Buffer.byteLength(rawText, "utf-8");
  if (byteSize <= OCR_RAW_TEXT_SIZE_LIMIT) {
    return { ocrRawText: rawText, ocrRawTextS3Key: null };
  }
  // 10KB 초과 시 — S3 저장은 백엔드 담당, 여기선 null + 플래그만 반환
  // TODO: 백엔드와 S3 key 형식 협의 후 실제 업로드 로직 추가
  console.warn(`[OCR] ocrRawText ${byteSize}bytes > 10KB 초과 → S3 분리 필요`);
  return { ocrRawText: null, ocrRawTextS3Key: "PENDING" }; // 백엔드 협의 후 key 형식 확정
}

// ─────────────────────────────────────────
// OCR 실패 fallback 출력
// ─────────────────────────────────────────

function ocrFailureOutput(input: OcrInput, reason: string): OcrOutput {
  return {
    inputType:       input.inputType,
    date:            null,
    merchant:        null,
    amount:          null,
    description:     "영수증",
    categoryId:      null,
    categoryName:    null,
    payerName:       null,
    evidenceStatus:  EvidenceStatus.OCR_FAILED,
    evidenceFileId:  input.evidenceFileId,
    items:           [],
    aiConfidence:    0.0,
    needsReview:     true,
    missingFields:   ["date", "merchant", "amount", "category"],
    reviewReason:    reason,
    reviewCode:      null,
    ocrRawText:      "",
    ocrRawTextS3Key: null,
  };
}

// ─────────────────────────────────────────
// 메인: OCR 분석 파이프라인
// ─────────────────────────────────────────

/**
 * S3 영수증 이미지 → Textract → Bedrock 정제 → OcrOutput 반환
 */
export async function runOcrPipeline(input: OcrInput): Promise<OcrOutput> {

  // 1. Textract 호출
  const textractResult = await analyzeExpense(input.s3Key);

  if (!textractResult.success) {
    console.error("[OCR] Textract 실패:", textractResult.error);
    return ocrFailureOutput(input, "OCR 분석 실패");
  }

  const { date, merchant, amount, items, rawText } = textractResult;

  // OCR 결과 텍스트 거의 없음 → 실패 처리
  if (!rawText || rawText.trim().length < 10) {
    console.warn("[OCR] rawText 너무 짧음 → OCR 실패 처리");
    return ocrFailureOutput(input, "OCR 인식 결과 없음");
  }

  // 2. Bedrock 호출 (Textract 결과 정제 + 카테고리 분류)
  let llmRaw: LLMOcrRaw;
  try {
    const prompt = buildOcrPrompt({
      categories: input.categories,
      textract: { date, merchant, amount, items },
      ocrRawText: rawText,
    });
    llmRaw = await callBedrock(prompt) as unknown as LLMOcrRaw;
  } catch (err) {
    console.error("[OCR] Bedrock 호출 실패:", err);
    // Bedrock 실패 시 Textract 결과만으로 fallback 조립
    llmRaw = {
      date,
      merchant,
      amount,
      description: buildDescription(merchant, date),
      categoryId: null,
      items,
      confidence: {
        date:     !!date,
        merchant: !!merchant,
        amount:   amount !== null,
        items:    items.length > 0,
        category: false,
      },
    };
  }

  // 3. amount null → needsReview 무조건 true
  if (llmRaw.amount === null) {
    console.warn("[OCR] amount null → needsReview 강제");
  }

  // 4. 신뢰도 계산
  const { aiConfidence, missingFields, needsReview, reviewReason } =
    calcOcrConfidence(llmRaw);

  // amount null이면 needsReview 강제 추가
  const finalNeedsReview = needsReview || llmRaw.amount === null;
  const finalReviewReason = llmRaw.amount === null && !needsReview
    ? "금액 미확인"
    : reviewReason;

  // 5. categoryName 동기화
  const categoryName = llmRaw.categoryId
    ? (input.categories.find(c => c.id === llmRaw.categoryId)?.name ?? null)
    : null;

  // 6. ocrRawText 크기 처리
  const { ocrRawText, ocrRawTextS3Key } = handleRawText(rawText);

  // 7. 최종 출력 조립
  const output: OcrOutput = {
    inputType:       input.inputType,
    date:            llmRaw.date,
    merchant:        llmRaw.merchant,
    amount:          llmRaw.amount,
    description:     llmRaw.description || buildDescription(llmRaw.merchant, llmRaw.date),
    categoryId:      llmRaw.categoryId,
    categoryName,
    payerName:       null,   // 영수증에서 추출 불가, 항상 null
    evidenceStatus:  EvidenceStatus.OCR_COMPLETED,
    evidenceFileId:  input.evidenceFileId,
    items:           llmRaw.items,
    aiConfidence,
    needsReview:     finalNeedsReview,
    missingFields,
    reviewReason:    finalReviewReason,
    reviewCode:      null,
    ocrRawText,
    ocrRawTextS3Key,
  };

  return output;
}
