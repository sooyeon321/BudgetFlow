// BudgetFlow LLM Service - Anthropic API 클라이언트
// Bedrock 권한 이슈로 Anthropic API 직접 호출 방식으로 전환

import Anthropic from "@anthropic-ai/sdk";

const MODEL_ID = "claude-haiku-4-5-20251001";

/**
 * Anthropic API를 호출하고 JSON 응답을 반환합니다.
 */
export async function callBedrock(prompt: string): Promise<Record<string, unknown>> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 1000,
    messages: [
      { role: "user", content: prompt },
    ],
  });

  // 마크다운 코드블록 제거 후 JSON 파싱
  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(clean);
}
