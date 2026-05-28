// BudgetFlow LLM Service - Textract 클라이언트
// AnalyzeExpense API로 영수증 이미지에서 구조적 데이터 추출
// npm install @aws-sdk/client-textract

import {
  TextractClient,
  AnalyzeExpenseCommand,
  type ExpenseDocument,
  type LineItemGroup,
} from "@aws-sdk/client-textract";

const client = new TextractClient({
  region: process.env.AWS_REGION ?? "ap-northeast-2",
});

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────

export interface TextractItem {
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  amount: number;
}

export interface TextractResult {
  success: true;
  date: string | null;        // YYYY-MM-DD
  merchant: string | null;
  amount: number | null;      // 합계 금액
  items: TextractItem[];
  rawText: string;            // 전체 텍스트 (ocrRawText용)
}

export interface TextractFailure {
  success: false;
  error: string;
}

export type TextractResponse = TextractResult | TextractFailure;

// ─────────────────────────────────────────
// 금액 문자열 → 정수 변환
// ─────────────────────────────────────────

function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[,\s원₩$]/g, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num);
}

// ─────────────────────────────────────────
// 날짜 문자열 → YYYY-MM-DD 변환
// ─────────────────────────────────────────

function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;

  // YYYY-MM-DD 또는 YYYY/MM/DD
  const isoMatch = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YY-MM-DD 또는 YY/MM/DD
  const shortMatch = raw.match(/(\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (shortMatch) {
    const [, y, m, d] = shortMatch;
    return `20${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

// ─────────────────────────────────────────
// ExpenseDocument → TextractResult 파싱
// ─────────────────────────────────────────

function parseExpenseDocument(doc: ExpenseDocument): Omit<TextractResult, "success" | "rawText"> {
  let date: string | null = null;
  let merchant: string | null = null;
  let amount: number | null = null;
  const items: TextractItem[] = [];

  // SummaryFields에서 date, merchant, total 추출
  for (const field of doc.SummaryFields ?? []) {
    const type = field.Type?.Text?.toUpperCase();
    const value = field.ValueDetection?.Text;

    switch (type) {
      case "INVOICE_RECEIPT_DATE":
      case "DATE":
        if (!date) date = parseDate(value);
        break;
      case "NAME":
      case "VENDOR_NAME":
      case "MERCHANT_NAME":
        if (!merchant && value) merchant = value.trim();
        break;
      case "TOTAL":
      case "AMOUNT_DUE":
      case "AMOUNT_PAID":
        if (!amount) amount = parseAmount(value);
        break;
    }
  }

  // LineItemGroups에서 품목 추출
  for (const group of doc.LineItemGroups ?? []) {
    for (const lineItem of (group as LineItemGroup).LineItems ?? []) {
      let itemName: string | null = null;
      let itemQty: number | null = null;
      let itemUnitPrice: number | null = null;
      let itemAmount: number | null = null;

      for (const field of lineItem.LineItemExpenseFields ?? []) {
        const type = field.Type?.Text?.toUpperCase();
        const value = field.ValueDetection?.Text;

        switch (type) {
          case "ITEM":
          case "PRODUCT_CODE":
            if (!itemName && value) itemName = value.trim();
            break;
          case "QUANTITY":
            if (value) itemQty = parseFloat(value.replace(/[^0-9.]/g, "")) || null;
            break;
          case "UNIT_PRICE":
            if (!itemUnitPrice) itemUnitPrice = parseAmount(value);
            break;
          case "PRICE":
          case "EXPENSE_ROW":
            if (!itemAmount) itemAmount = parseAmount(value);
            break;
        }
      }

      // 품목명과 금액이 있는 경우만 추가
      if (itemName && itemAmount !== null) {
        items.push({
          name: itemName,
          quantity: itemQty,
          unitPrice: itemUnitPrice,
          amount: itemAmount,
        });
      }
    }
  }

  return { date, merchant, amount, items };
}

// ─────────────────────────────────────────
// 메인: AnalyzeExpense 호출
// ─────────────────────────────────────────

/**
 * S3에 저장된 영수증 이미지를 Textract AnalyzeExpense로 분석합니다.
 * @param s3Key  S3 객체 키 (예: "receipts/proj_abc/receipt_001.jpg")
 */
export async function analyzeExpense(s3Key: string): Promise<TextractResponse> {
  const bucketName = process.env.S3_BUCKET_NAME ?? "2026-inha-cc-04-s3";

  const command = new AnalyzeExpenseCommand({
    Document: {
      S3Object: {
        Bucket: bucketName,
        Name: s3Key,
      },
    },
  });

  let expenseDocs: ExpenseDocument[];
  try {
    const response = await client.send(command);
    expenseDocs = response.ExpenseDocuments ?? [];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Textract] AnalyzeExpense 호출 실패:", message);
    return { success: false, error: message };
  }

  if (expenseDocs.length === 0) {
    return { success: false, error: "Textract가 영수증을 인식하지 못했습니다." };
  }

  // 첫 번째 영수증 문서 파싱 (MVP는 1장 기준)
  const parsed = parseExpenseDocument(expenseDocs[0]);

  // rawText: 모든 필드 값 전체 합산
  const rawText = expenseDocs
    .flatMap(doc => [
      ...(doc.SummaryFields ?? []).map(f => f.ValueDetection?.Text ?? ""),
      ...(doc.LineItemGroups ?? []).flatMap(g =>
        (g as LineItemGroup).LineItems?.flatMap(li =>
          li.LineItemExpenseFields?.map(f => f.ValueDetection?.Text ?? "") ?? []
        ) ?? []
      ),
    ])
    .filter(Boolean)
    .join("\n");

  return {
    success: true,
    ...parsed,
    rawText,
  };
}
