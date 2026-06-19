// BudgetFlow LLM Service - 프롬프트 빌더
// text_parse_prompt.txt / ocr_vision_prompt.txt의 플레이스홀더를 실제 값으로 치환합니다.

import fs from "fs";
import path from "path";
import { z } from "zod";
import { CategorySchema } from "./BudgetFlow_LLM_Lambda_zod_schema";

type Category = z.infer<typeof CategorySchema>;

interface SubmittedBy {
  userId: string;
  displayName: string;
}

export interface TextParsePromptParams {
  text: string;
  requestDate: string;
  timezone: string;
  submittedBy: SubmittedBy;
  categories: Category[];
}

export interface OcrVisionPromptParams {
  categories: Category[];
}

const PROMPTS_DIR = path.resolve(__dirname, "../prompts");
const _cache: Record<string, string> = {};

function getTemplate(filename: string): string {
  if (!_cache[filename]) {
    const filePath = path.join(PROMPTS_DIR, filename);
    try {
      _cache[filename] = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      throw new Error(`[PromptBuilder] 프롬프트 파일을 읽을 수 없습니다: ${filePath}\n${err}`);
    }
  }
  return _cache[filename];
}

function formatCategories(categories: Category[]): string {
  if (categories.length === 0) return "(카테고리 없음)";
  return categories
    .map((c) => `- ${c.id} | ${c.name} | keywords: ${c.keywords.join(", ")}`)
    .join("\n");
}

function replacePlaceholders(template: string, values: Record<string, string>): string {
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

export function buildOcrVisionPrompt(params: OcrVisionPromptParams): string {
  return replacePlaceholders(getTemplate("ocr_vision_prompt.txt"), {
    categories: formatCategories(params.categories),
  });
}
