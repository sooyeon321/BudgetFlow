// Bedrock 연동 테스트
// npx tsx src/test-bedrock.ts 로 실행
// .env에 AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY 필요

import dotenv from "dotenv";
dotenv.config();

import { callBedrock } from "./bedrockClient";
import { buildTextParsePrompt } from "./promptBuilder";
import { calcTextParseConfidence, shouldRequestReInput } from "./confidence";

const CATEGORIES = [
  { id: "cat_01", name: "다과비",  keywords: ["간식", "음료", "다과", "케이터링"] },
  { id: "cat_02", name: "식비",    keywords: ["식사", "밥", "점심", "저녁", "삼겹살", "회식"] },
  { id: "cat_03", name: "교통비",  keywords: ["택시", "버스", "지하철", "교통"] },
  { id: "cat_04", name: "회의비",  keywords: ["회의", "미팅", "세미나"] },
];

const TEST_CASES = [
  { id: "TC-01", text: "어제 행사 다과 32,000원",          requestDate: "2026-05-17" },
  { id: "TC-02", text: "삼겹살 158000 홍길동",              requestDate: "2026-05-17" },
  { id: "TC-03", text: "5/12 OO마트 영수증",               requestDate: "2026-05-17" },
  { id: "TC-04", text: "회식비",                           requestDate: "2026-05-17" },
  { id: "TC-05", text: "2만원",                            requestDate: "2026-05-17" },
  { id: "TC-06", text: "택시비 오만원",                     requestDate: "2026-05-17" },
  { id: "TC-07", text: "커피 회의 15000원",                 requestDate: "2026-05-17" },
  { id: "TC-08", text: "4/30 점심 식대 12000원",           requestDate: "2026-05-17" },
  { id: "TC-09", text: "GS25 편의점 간식 8500원",          requestDate: "2026-05-17" },
  { id: "TC-10", text: "2026-05-15 스타벅스 다과비 홍길동 43000원", requestDate: "2026-05-17" },
  { id: "TC-11", text: "저번 주 화요일 세미나 간식 25000원", requestDate: "2026-05-17" },
  { id: "TC-12", text: "행사 홍보물 제작비 1,250,000원",   requestDate: "2026-05-17" },
];

// 실행할 TC 범위 (기본: TC-01 한 개만. 전체 실행 시 주석 해제)
const RUN_CASES = TEST_CASES.slice(0, 1);
// const RUN_CASES = TEST_CASES; // 전체 실행

async function runOne(tc: typeof TEST_CASES[number]) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶ ${tc.id}: "${tc.text}"`);

  const prompt = buildTextParsePrompt({
    text: tc.text,
    requestDate: tc.requestDate,
    timezone: "Asia/Seoul",
    submittedBy: { userId: "U12345", displayName: "진수연" },
    categories: CATEGORIES,
  });

  let llmRaw: Record<string, unknown>;
  try {
    llmRaw = await callBedrock(prompt);
  } catch (err) {
    console.error("  ❌ Bedrock 호출 실패:", err);
    return;
  }

  console.log("\n  [LLM 원본 출력]");
  console.log(JSON.stringify(llmRaw, null, 2));

  // amount null → 재입력 대상
  if (shouldRequestReInput(llmRaw as any)) {
    console.log("\n  ⚠️  amount = null → 재입력 요청 대상");
  }

  // 신뢰도 계산
  const { aiConfidence, missingFields, needsReview, reviewReason } =
    calcTextParseConfidence(llmRaw as any);

  console.log("\n  [신뢰도 계산 결과]");
  console.log(`  aiConfidence : ${aiConfidence}`);
  console.log(`  missingFields: ${JSON.stringify(missingFields)}`);
  console.log(`  needsReview  : ${needsReview}`);
  console.log(`  reviewReason : ${reviewReason}`);
}

async function main() {
  console.log("=== Bedrock 연동 테스트 시작 ===");
  console.log(`AWS_REGION: ${process.env.AWS_REGION ?? "(미설정 — 기본값 ap-northeast-2 사용)"}`);
  console.log(`실행 케이스: ${RUN_CASES.map(t => t.id).join(", ")}`);

  for (const tc of RUN_CASES) {
    await runOne(tc);
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log("=== 테스트 완료 ===");
}

main().catch(console.error);
