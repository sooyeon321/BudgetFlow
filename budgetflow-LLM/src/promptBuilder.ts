// BudgetFlow LLM Service - 프롬프트 빌더
// text_parse_prompt.txt / ocr_parse_prompt.txt의 플레이스홀더를 실제 값으로 치환합니다.
// 프롬프트 내용 변경은 각 .txt 파일만 수정하면 됩니다.

import fs from "fs";
import path from "path";
import { z } from "zod";
import { CategorySchema } from "./BudgetFlow_LLM_Lambda_zod_schema";
import type { TextractItem } from "./textractClient";

// ─────────────────────────────────────────
// 공통 타입
// ─────────────────────────────────────────

type Category = z.infer<typeof CategorySchema>;

interface SubmittedBy {
  userId: string;
  displayName: string;
}

export interface TextParsePromptParams {
  text: string;
  requestDate: string;   // YYYY-MM-DD
  timezone: string;      // e.g. "Asia/Seoul"
  submittedBy: SubmittedBy;
  categories: Category[];
}

export interface OcrPromptParams {
  categories: Category[];
  textract: {
    date: string | null;
    merchant: string | null;
    amount: number | null;
    items: TextractItem[];
  };
  ocrRawText: string;
}

// ─────────────────────────────────────────
// 프롬프트 파일 로드 (파일별 캐시)
// ─────────────────────────────────────────

const PROMPTS_DIR = path.resolve(__dirname, "../prompts");
const _cache: Record<string, string> = {};

function getTemplate(filename: string): string {
  if (!_cache[filename]) {
    const filePath = path.join(PROMPTS_DIR, filename);
    try {
      _cache[filename] = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      throw new Error(
        `[PromptBuilder] 프롬프트 파일을 읽을 수 없습니다: ${filePath}\n${err}`
      );
    }
  }
  return _cache[filename];
}

// ─────────────────────────────────────────
// 공통 유틸
// ─────────────────────────────────────────

/** 카테고리 배열 → 프롬프트용 텍스트 */
function formatCategories(categories: Category[]): string {
  if (categories.length === 0) return "(카테고리 없음)";
  return categories
    .map((c) => `- ${c.id} | ${c.name} | keywords: ${c.keywords.join(", ")}`)
    .join("\n");
}

/** Textract items 배열 → 프롬프트용 텍스트 */
function formatItems(items: TextractItem[]): string {
  if (items.length === 0) return "(품목 없음)";
  return items
    .map((item) => {
      const qty      = item.quantity  != null ? `수량: ${item.quantity}`  : "";
      const unit     = item.unitPrice != null ? `단가: ${item.unitPrice}` : "";
      const extras   = [qty, unit].filter(Boolean).join(", ");
      return `- ${item.name} | 금액: ${item.amount}${extras ? ` | ${extras}` : ""}`;
    })
    .join("\n");
}

/** {{key}} 플레이스홀더 치환. 미치환 시 경고 */
function replacePlaceholders(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  const remaining = result.match(/\{\{[^}]+\}\}/g);
  if (remaining) {
    console.warn(`[PromptBuilder] 치환되지 않은 플레이스홀더: ${remaining.join(", ")}`);
  }
  return result;
}

// ─────────────────────────────────────────
// 퍼블릭 API
// ─────────────────────────────────────────

/** 텍스트 파싱용 프롬프트 생성 */
export function buildTextParsePrompt(params: TextParsePromptParams): string {
  return replacePlaceholders(getTemplate("text_parse_prompt.txt"), {
    requestDate:               params.requestDate,
    timezone:                  params.timezone,
    "submittedBy.displayName": params.submittedBy.displayName,
    "submittedBy.userId":      params.submittedBy.userId,
    categories:                formatCategories(params.categories),
    text:                      params.text,
  });
}

/** OCR 정제용 프롬프트 생성 */
export function buildOcrPrompt(params: OcrPromptParams): string {
  return replacePlaceholders(getTemplate("ocr_parse_prompt.txt"), {
    categories:       formatCategories(params.categories),
    "textract.date":     params.textract.date     ?? "null",
    "textract.merchant": params.textract.merchant  ?? "null",
    "textract.amount":   params.textract.amount    != null ? String(params.textract.amount) : "null",
    "textract.items":    formatItems(params.textract.items),
    ocrRawText:       params.ocrRawText || "(없음)",
  });
}

// ─────────────────────────────────────────
// 디버그용 미리보기
// ─────────────────────────────────────────

if (process.argv[1] === __filename) {
  const CATEGORIES = [
    { id: "cat_01", name: "다과비", keywords: ["간식", "음료", "다과", "케이터링"] },
    { id: "cat_02", name: "식비",   keywords: ["식사", "밥", "점심", "저녁"] },
  ];

  console.log("── [텍스트 파싱] 프롬프트 미리보기 ──────────\n");
  console.log(buildTextParsePrompt({
    text: "어제 행사 다과 32,000원",
    requestDate: "2026-05-17",
    timezone: "Asia/Seoul",
    submittedBy: { userId: "U12345", displayName: "진수연" },
    categories: CATEGORIES,
  }));

  console.log("\n── [OCR 정제] 프롬프트 미리보기 ──────────────\n");
  console.log(buildOcrPrompt({
    categories: CATEGORIES,
    textract: {
      date: "2026-05-15",
      merchant: "OO편의점 강남점",
      amount: 15800,
      items: [
        { name: "삼각김밥", quantity: 2, unitPrice: 1500, amount: 3000 },
        { name: "아메리카노", quantity: 1, unitPrice: 4500, amount: 4500 },
      ],
    },
    ocrRawText: "OO편의점 강남점\n2026-05-15 14:32\n삼각김밥 x2 3,000원\n아메리카노 4,500원\n합계 15,800원",
  }));
}
