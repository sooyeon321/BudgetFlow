// src/modules/ai_ocr/ai_ocr.service.ts

import axios from "axios";

const LLM_URL = process.env.LLM_SERVICE_URL ?? "http://localhost:4000";

// ── 타입 ──────────────────────────────────────────────────────
export interface TextAnalyzeInput {
  text: string;
  projectId: string;
  requestDate: string;
  timezone: string;
  submittedBy: { userId: string; displayName: string };
  categories: { id: string; name: string; keywords: string[] }[];
}

export interface ImageAnalyzeInput {
  s3Key: string;
  projectId: string;
  evidenceFileId: string;
  submittedBy: { userId: string; displayName: string };
  categories: { id: string; name: string; keywords: string[] }[];
}

export interface LlmAnalyzeResult {
  action?: "request_re_input";  // amount null이면 이 필드만 옴
  userId?: string;
  rawInput?: string;

  inputType?: "text" | "image";
  date: string | null;
  amount: number | null;
  merchant: string | null;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  payerName: string | null;
  evidenceStatus: string;
  evidenceFileId: string | null;
  aiConfidence: number;
  needsReview: boolean;
  missingFields: string[];
  reviewReason: string | null;
  items?: { name: string; quantity: number | null; unitPrice: number | null; amount: number }[];
}

// ── 서비스 ────────────────────────────────────────────────────
export const aiOcrService = {
  analyzeText: async (input: TextAnalyzeInput): Promise<LlmAnalyzeResult> => {
    const { data } = await axios.post<LlmAnalyzeResult>(
      `${LLM_URL}/analyze/text`,
      { inputType: "text", ...input }
    );
    return data;
  },

  analyzeImage: async (input: ImageAnalyzeInput): Promise<LlmAnalyzeResult> => {
    const { data } = await axios.post<LlmAnalyzeResult>(
      `${LLM_URL}/analyze/image`,
      { inputType: "image", ...input }
    );
    return data;
  },
};