// Bedrock 직접 연결 확인용 — Playground 없이 InvokeModel 직접 호출
// npx tsx src/ping-bedrock.ts

import dotenv from "dotenv";
dotenv.config();

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "ap-northeast-2",
});

async function ping() {
  console.log(`리전: ${process.env.AWS_REGION ?? "ap-northeast-2"}`);
  console.log("Bedrock InvokeModel 호출 중...\n");

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 50,
      messages: [{ role: "user", content: "respond with only: ok" }],
    }),
  });

  try {
    const res = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(res.body));
    console.log("✅ 연결 성공!");
    console.log("응답:", body.content[0].text);
  } catch (err: any) {
    console.error("❌ 실패:", err.name);
    console.error("메시지:", err.message);
  }
}

ping();
