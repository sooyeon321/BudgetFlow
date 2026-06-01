// BudgetFlow LLM Service - Bedrock 클라이언트
// AWS SDK v3 사용
// npm install @aws-sdk/client-bedrock-runtime

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

/**
 * Bedrock Claude Haiku를 호출하고 JSON 응답을 반환합니다.
 * 응답이 JSON이 아니면 예외를 발생시킵니다.
 */
export async function callBedrock(prompt: string): Promise<Record<string, unknown>> {
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        { role: "user", content: prompt },
      ],
    }),
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  const text = body.content[0].text.trim();

  return JSON.parse(text); // JSON 파싱 실패 시 예외 발생
}
