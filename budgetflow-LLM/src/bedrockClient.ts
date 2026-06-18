// BudgetFlow LLM Service - Anthropic API 클라이언트
// Bedrock 권한 이슈로 Anthropic API 직접 호출 방식으로 전환

import Anthropic from "@anthropic-ai/sdk";

const MODEL_ID = "claude-haiku-4-5-20251001";

function parseJsonResponse(raw: string): Record<string, unknown> {
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(clean);
}

export async function callBedrock(
  prompt: string,
): Promise<Record<string, unknown>> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (
    message.content[0] as { type: string; text: string }
  ).text.trim();
  return parseJsonResponse(text);
}

export async function callBedrockVision(
  prompt: string,
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
): Promise<Record<string, unknown>> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const text = (
    message.content[0] as { type: string; text: string }
  ).text.trim();
  return parseJsonResponse(text);
}
