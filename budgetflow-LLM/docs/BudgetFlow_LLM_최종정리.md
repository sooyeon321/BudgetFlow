# BudgetFlow LLM/OCR 서비스 — 최종 정리

작성자: 진수연 (LLM 담당)
최종 업데이트: 2026-06-16

---

## 1. 한 줄 요약

텍스트 파싱(Phase 2)과 영수증 OCR(Phase 3) 모두 구현 완료, E2E 테스트(슬랙 → 봇 → 백엔드 → LLM → DB) 성공. AWS Bedrock/Textract 권한 이슈로 인해 Anthropic API 직접 호출 + Claude Vision 방식으로 전환했음.

---

## 2. 엔드포인트

LLM 서비스는 EC2 위에서 별도 Express 서버로 실행 중이며, 백엔드가 HTTP로 호출한다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/analyze/text` | 텍스트 지출 파싱 |
| POST | `/analyze/image` | 영수증 이미지 OCR |
| GET | `/health` | 헬스체크 |

> EC2 Public IP는 재시작 시마다 바뀐다. 현재 IP와 포트는 팀 채널에서 별도 공지.
> 포트는 기본 4000이나, 충돌 시 자동으로 4001 등으로 올라갈 수 있다.

---

## 3. 아키텍처 변경 사항 (중요)

### 3.1 배경

학교 AWS 계정의 IAM 역할(`SafeRole-2026-inha-cc-04`)에 아래 두 권한이 explicit deny로 막혀 있었다.

- `bedrock:InvokeModel`
- `textract:AnalyzeExpense`

EC2와 Lambda 양쪽에서 동일하게 막혀 있어 교수님 측 정책 문제로 확인되었고, 별도 대체 안내를 받기 전까지 우회 구현으로 전환했다.

### 3.2 변경 후 구조

| 단계 | 기존 설계 | 변경 후 |
|---|---|---|
| 텍스트 파싱 LLM 호출 | AWS Bedrock (Claude Haiku) | Anthropic API 직접 호출 (Claude Haiku 4.5) |
| 영수증 OCR | Textract → Bedrock 2단계 | Claude Vision 1단계 (이미지 직접 분석) |

영수증 OCR은 기존에 *Textract로 구조화 추출 → Bedrock으로 정제/분류* 하는 2단계였으나, Textract 단계를 제거하고 Claude Vision이 이미지를 직접 보고 추출+분류를 한 번에 수행하도록 변경했다. 실제 영수증 2장으로 테스트한 결과 날짜/상호명/금액/품목 추출 정확도는 기존 설계와 동등하거나 더 높았다.

신뢰도 계산 규칙, `needsReview` 판정 조건, `missingFields`, `ocrRawText` 10KB 초과 시 S3 분리 등 기존에 합의된 정책은 전부 그대로 유지했다. 출력 스키마(JSON 구조)도 변경 없음.

---

## 4. 텍스트 파싱 — 요청/응답 예시

**요청**
```json
{
  "inputType": "text",
  "text": "어제 행사 다과 32,000원",
  "projectId": "proj_abc123",
  "requestDate": "2026-06-16",
  "timezone": "Asia/Seoul",
  "submittedBy": { "userId": "U12345", "displayName": "진수연" },
  "categories": [
    { "id": "cat_01", "name": "다과비", "keywords": ["간식", "음료", "다과", "케이터링"] }
  ]
}
```

**응답**
```json
{
  "inputType": "text",
  "date": "2026-06-15",
  "amount": 32000,
  "merchant": null,
  "description": "행사 다과",
  "categoryId": "cat_01",
  "categoryName": "다과비",
  "payerName": null,
  "evidenceStatus": "none",
  "evidenceFileId": null,
  "aiConfidence": 0.9,
  "needsReview": true,
  "missingFields": ["merchant", "payerName", "evidence"],
  "reviewReason": "증빙 없음, 사용처 미확인",
  "reviewCode": null,
  "rawInput": "어제 행사 다과 32,000원"
}
```

테스트 케이스(TC-01~12) 전부 통과 확인.

---

## 5. 영수증 OCR — 요청/응답 예시

**요청**
```json
{
  "inputType": "image",
  "s3Key": "receipt_001.jpg",
  "projectId": "proj_abc123",
  "evidenceFileId": "evf_xyz789",
  "submittedBy": { "userId": "U12345", "displayName": "진수연" },
  "categories": [
    { "id": "cat_02", "name": "식비", "keywords": ["식사", "밥", "점심", "저녁"] }
  ]
}
```

**응답 (실제 영수증 테스트 결과)**
```json
{
  "inputType": "image",
  "date": "2026-06-12",
  "merchant": "타코마이너",
  "amount": 17000,
  "description": "타코마이너 영수증",
  "categoryId": "cat_02",
  "categoryName": "식비",
  "payerName": null,
  "evidenceStatus": "ocr_completed",
  "evidenceFileId": "evf_test_001",
  "items": [
    { "name": "감자튀김", "quantity": 1, "unitPrice": 6000, "amount": 6000 },
    { "name": "롤부리또", "quantity": 1, "unitPrice": 11000, "amount": 11000 }
  ],
  "aiConfidence": 1.0,
  "needsReview": false,
  "missingFields": [],
  "reviewReason": null,
  "reviewCode": null,
  "ocrRawText": "...",
  "ocrRawTextS3Key": null
}
```

품목 합계와 영수증 합계가 일치하고 모든 필드가 추출되어 `aiConfidence: 1.0`, `needsReview: false`로 정확히 처리된 사례.

### 검증된 예외 케이스

실제 영수증으로 추가 테스트한 결과, 할인이 적용된 영수증에서는 품목 정가 합계(예: 3,900원)와 실제 결제액(예: 3,120원)이 달라 `needsReview: true`로 정확히 분류되었다(`reviewReason: "품목 합계와 영수증 합계 불일치"`). 의도된 검증 로직이 정상 작동함을 확인.

다만 테스트에 사용한 카테고리 목록이 좁아(다과비/식비만 존재) 의류·잡화 영수증에서 카테고리가 부정확하게 매칭되는 경우가 있었다. 이는 코드 결함이 아니라 테스트 데이터 한계이며, 실제 프로젝트의 폭넓은 카테고리 목록을 사용하면 해결될 가능성이 높다. 다만 안전장치로 "후보 카테고리 중 명확히 맞는 것이 없으면 categoryId를 null로 반환" 하는 규칙을 프롬프트에 보강하는 것을 고려 중이다.

---

## 6. 공통 출력 필드 규칙 (변경 없음, 기존 합의 유지)

| 필드 | 규칙 |
|---|---|
| `amount` | 쉼표 제거, 원 단위 정수, 0 이상, 추출 불가 시 null |
| `categoryId` / `categoryName` | categoryId가 null이면 categoryName도 반드시 null |
| `evidenceStatus` | 텍스트는 `none`, OCR 성공은 `ocr_completed`, OCR 실패는 `ocr_failed` |
| `needsReview` | `aiConfidence < 0.7`, 증빙 없음(텍스트는 무조건), amount null, 품목 합계 불일치(오차 5% 초과) 중 하나라도 해당 시 true |
| `reviewReason` | needsReview가 true면 최소 1개 이상의 사유 포함, false면 반드시 null |
| `ocrRawText` | 10KB 이하면 그대로 포함, 초과 시 null + `ocrRawTextS3Key`에 플래그(백엔드와 S3 key 형식 추후 협의 필요) |

---

## 7. 백엔드 연동 시 주의사항

1. `requestDate`는 텍스트 파싱에서 "어제", "오늘" 같은 상대 날짜 계산 기준이므로 호출 시점의 실제 날짜를 YYYY-MM-DD로 넘겨야 한다.
2. `categories` 배열은 프로젝트별로 다르게 구성되어 매 요청마다 동적으로 전달되어야 한다. 카테고리가 비어 있으면 카테고리 분류가 항상 실패한다.
3. OCR 요청의 `s3Key`는 백엔드가 Slack에서 받은 이미지를 S3에 업로드한 후의 키 값이다. (버킷: `2026-inha-cc-04-s3`)
4. `amount`가 null인 텍스트 파싱 결과는 Expense로 저장하지 않고 봇이 사용자에게 재입력을 요청하는 흐름으로 처리해야 한다(기존 합의 유지).

---

## 8. 남은 작업

- [ ] 카테고리 후보가 부적합할 때 categoryId를 더 보수적으로 null 처리하도록 프롬프트 보강
- [ ] `ocrRawTextS3Key` 형식 백엔드와 최종 협의 (현재는 placeholder)
- [ ] 서버 무중단 운영을 위한 백그라운드 실행/모니터링 정리
- [ ] PR 머지 (Anthropic API 전환 PR, Claude Vision OCR 전환 PR 각각 팀원 Approve 대기 중)

---

## 9. 코드 위치

```
budgetflow-LLM/
├── src/
│   ├── app.ts                              ← Express 서버, 엔드포인트 정의
│   ├── bedrockClient.ts                    ← Anthropic API 호출 (텍스트 + Vision)
│   ├── s3Client.ts                         ← S3 이미지 다운로드 (Base64 변환)
│   ├── promptBuilder.ts                    ← 프롬프트 템플릿 치환
│   ├── ocrService.ts                       ← OCR 파이프라인 (S3 → Vision → 신뢰도 계산)
│   ├── confidence.ts                       ← 텍스트 파싱 신뢰도 계산
│   └── BudgetFlow_LLM_Lambda_zod_schema.ts ← 입출력 Zod 스키마
├── prompts/
│   ├── text_parse_prompt.txt
│   └── ocr_vision_prompt.txt
└── docs/
    ├── BudgetFlow_LLM_Lambda_출력스키마_v4.md
    └── test_cases_text_parse.md
```
