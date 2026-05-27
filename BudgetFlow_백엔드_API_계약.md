# BudgetFlow 백엔드 API 계약 문서

## 0. 문서 목적

이 문서는 BudgetFlow 프론트엔드가 현재 Mock API로 사용 중인 데이터 계약을 백엔드 개발자에게 전달하기 위한 API 명세 초안이다.

프론트엔드는 이후 AWS 백엔드로 이전할 때 화면 코드를 최대한 유지하고, 다음 경계만 교체하는 것을 목표로 한다.

- `budgetflow-frontend/src/lib/api/*` → API Gateway/Lambda 호출로 교체
- `budgetflow-frontend/src/lib/auth/*` → Cognito/Amplify Auth 연동으로 교체
- 파일 업로드/다운로드 → S3 Presigned URL 방식으로 교체

현재 프론트 기준 API base URL 환경 변수는 다음 이름을 사용한다.

```env
NEXT_PUBLIC_BUDGETFLOW_API_BASE_URL=https://api.example.com
```

---

## 1. 공통 규칙

### 1.1 인증

MVP 운영 환경에서는 Cognito JWT를 `Authorization` 헤더로 전달하는 방식을 권장한다. 

```http
Authorization: Bearer <Cognito ID token 또는 Access token>
Content-Type: application/json
```

프론트에 필요한 Cognito 환경 변수:

```env
NEXT_PUBLIC_AWS_REGION=ap-northeast-2
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_APP_CLIENT_ID=
NEXT_PUBLIC_BUDGETFLOW_API_BASE_URL=
```

### 1.2 응답 형식

성공 응답은 리소스 객체 또는 배열을 바로 반환한다.

```json
{
  "id": "project-aingthon",
  "name": "AINGTHON 운영 예산"
}
```

에러 응답은 프론트에서 사람이 읽을 수 있는 메시지를 표시할 수 있도록 다음 형식을 권장한다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 올바르지 않습니다.",
    "details": [
      { "field": "amount", "message": "금액은 1원 이상이어야 합니다." }
    ]
  }
}
```

### 1.3 시간/금액/상태 규칙

- 시간: ISO 8601 string 사용. 예: `2026-05-15T09:20:00+09:00` 또는 UTC `2026-05-15T00:20:00Z`
- 금액: 원 단위 정수 `number`
- 날짜 필드: `YYYY-MM-DD`
- confidence: `0` 이상 `1` 이하 number
- 프론트는 지출 목록을 5초 간격으로 polling한다.

---

## 2. 도메인 타입

### 2.1 상태값

```ts
ProjectStatus = "active" | "closed";

ExpenseStatus =
  | "created"
  | "processing"
  | "needs_review"
  | "approved"
  | "rejected"
  | "exported";

EvidenceStatus =
  | "none"
  | "uploaded"
  | "ocr_completed"
  | "ocr_failed"
  | "verified";

ExportStatus =
  | "requested"
  | "generating"
  | "completed"
  | "failed"
  | "expired";

TemplateMappingStatus = "none" | "suggested" | "confirmed";

TemplateField =
  | "date"
  | "merchant"
  | "description"
  | "category"
  | "amount"
  | "payerName"
  | "evidence";
```

### 2.2 Project

```ts
type Project = {
  id: string;
  organizationId: string;
  name: string;
  totalBudget: number;
  status: "active" | "closed";
  slackChannelId: string;
  slackChannelName: string;
  templateFileName: string | null;
  templateMappingStatus: "none" | "suggested" | "confirmed";
  createdAt: string;
  closedAt: string | null;
};
```

### 2.3 BudgetCategory

```ts
type BudgetCategory = {
  id: string;
  projectId: string;
  name: string;
  budgetLimit: number;
  keywords: string[];
  approvedAmount: number;
  remainingAmount: number;
  usageRate: number;
  createdAt: string;
};
```

`approvedAmount`, `remainingAmount`, `usageRate`는 백엔드에서 계산해서 내려주는 것을 권장한다.

### 2.4 Expense

```ts
type Expense = {
  id: string;
  projectId: string;
  categoryId: string;
  date: string;
  amount: number;
  merchant: string;
  description: string;
  payerName: string;
  inputChannel: "slack";
  slackUserId: string;
  status: ExpenseStatus;
  evidenceStatus: EvidenceStatus;
  evidenceFileId: string | null;
  aiConfidence: number;
  missingFields: string[];
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### 2.5 EvidenceFile

```ts
type EvidenceFile = {
  id: string;
  projectId: string;
  expenseId: string;
  fileName: string;
  fileType: "image" | "pdf" | "xlsx";
  url: string;
  ocrStatus: EvidenceStatus;
  createdAt: string;
};
```

MVP 1차 UI에서는 증빙 미리보기 API가 아직 필수는 아니지만, `Expense.evidenceFileId`와 연결될 수 있도록 준비한다.

### 2.6 ExportJob

```ts
type ExportJob = {
  id: string;
  projectId: string;
  type: "budget_plan" | "expense_report";
  status: ExportStatus;
  includedExpenseCount: number;
  excludedReviewCount: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
};
```

`downloadUrl`은 S3 Presigned URL을 반환한다.

### 2.7 ExpenseSummary

```ts
type ExpenseSummary = {
  projectId: string;
  totalExpenseCount: number;
  needsReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  missingEvidenceCount: number;
  approvedAmount: number;
};
```

### 2.8 TemplateMapping

```ts
type TemplateMappingSuggestion = {
  sourceColumn: string;
  targetField: TemplateField;
  confidence: number;
  confirmed: boolean;
};

type TemplateUploadResult = {
  projectId: string;
  fileName: string;
  uploadStatus: "uploaded";
  mappingStatus: "suggested" | "confirmed";
  mappings: TemplateMappingSuggestion[];
};
```

---

## 3. API 목록 요약

| Method | Path | 목적 | 프론트 사용 화면 |
| --- | --- | --- | --- |
| GET | `/projects` | 프로젝트 목록 조회 | `/projects` |
| GET | `/projects/{projectId}` | 프로젝트 단건 조회 | `/expenses`, `/settings` |
| POST | `/projects` | 프로젝트 생성 | `/projects` |
| POST | `/projects/{projectId}/close` | 정산 마감 | `/expenses` |
| POST | `/projects/{projectId}/template` | 엑셀 양식 업로드/분석 요청 | `/settings` |
| PATCH | `/projects/{projectId}/template-mapping` | 엑셀 컬럼 매핑 확정 | `/settings` |
| GET | `/projects/{projectId}/expenses?status=` | 지출 목록 조회/필터 | `/expenses` |
| PATCH | `/expenses/{expenseId}/approve` | 지출 수정 후 승인 | `/expenses` |
| PATCH | `/expenses/{expenseId}/reject` | 지출 반려 | `/expenses` |
| GET | `/projects/{projectId}/expense-summary` | 지출 요약 조회 | `/expenses` |
| GET | `/projects/{projectId}/budget-categories` | 카테고리 목록/예산 현황 조회 | `/settings`, `/expenses` |
| POST | `/projects/{projectId}/budget-categories` | 카테고리 생성 | `/settings` |
| PATCH | `/budget-categories/{categoryId}` | 카테고리 수정 | `/settings` |
| GET | `/projects/{projectId}/exports` | Export job 목록 조회 | `/expenses` |
| POST | `/projects/{projectId}/exports/expense-report` | 지출내역서 생성 요청 | `/expenses` |

---

## 4. Project API

### 4.1 프로젝트 목록 조회

```http
GET /projects
```

응답:

```json
[
  {
    "id": "project-aingthon",
    "organizationId": "org-gdgoc",
    "name": "AINGTHON 운영 예산",
    "totalBudget": 1200000,
    "status": "active",
    "slackChannelId": "C-AINGTHON",
    "slackChannelName": "aingthon-budget",
    "templateFileName": "AINGTHON_지출내역서.xlsx",
    "templateMappingStatus": "confirmed",
    "createdAt": "2026-05-03T10:00:00+09:00",
    "closedAt": null
  }
]
```

정렬 권장:

- `createdAt` 최신순

### 4.2 프로젝트 단건 조회

```http
GET /projects/{projectId}
```

응답:

```json
{
  "id": "project-aingthon",
  "organizationId": "org-gdgoc",
  "name": "AINGTHON 운영 예산",
  "totalBudget": 1200000,
  "status": "active",
  "slackChannelId": "C-AINGTHON",
  "slackChannelName": "aingthon-budget",
  "templateFileName": "AINGTHON_지출내역서.xlsx",
  "templateMappingStatus": "confirmed",
  "createdAt": "2026-05-03T10:00:00+09:00",
  "closedAt": null
}
```

없을 때:

```http
404 Not Found
```

### 4.3 프로젝트 생성

```http
POST /projects
```

요청:

```json
{
  "organizationId": "org-gdgoc",
  "name": "AINGTHON 운영 예산",
  "totalBudget": 1200000,
  "slackChannelName": "#aingthon-budget",
  "templateFileName": "AINGTHON_지출내역서.xlsx"
}
```

검증 규칙:

- `organizationId`: required string
- `name`: trim 후 2자 이상
- `totalBudget`: 1 이상 정수
- `slackChannelName`: `#` 선택 허용, 영문/숫자/하이픈/언더스코어 허용
- `templateFileName`: optional string

응답:

```json
{
  "id": "project-new",
  "organizationId": "org-gdgoc",
  "name": "AINGTHON 운영 예산",
  "totalBudget": 1200000,
  "status": "active",
  "slackChannelId": "C-MOCK",
  "slackChannelName": "aingthon-budget",
  "templateFileName": "AINGTHON_지출내역서.xlsx",
  "templateMappingStatus": "none",
  "createdAt": "2026-05-15T06:30:00Z",
  "closedAt": null
}
```

백엔드 처리 메모:

- `slackChannelName`은 저장 시 앞의 `#` 제거 권장
- 실제 Slack channel 연결이 아직 없으면 `slackChannelId`는 별도 연결 후 갱신해도 됨

### 4.4 정산 마감

```http
POST /projects/{projectId}/close
```

요청 body 없음.

응답:

```json
{
  "id": "project-aingthon",
  "status": "closed",
  "closedAt": "2026-05-15T06:30:00Z"
}
```

실제 응답은 전체 `Project` 객체 반환을 권장한다.

백엔드 처리 메모:

- 마감 후 Slack 입력 차단 또는 `created` 차단 정책은 백엔드/봇에서 결정
- 이미 closed인 경우 idempotent하게 closed project 반환 권장

---

## 5. Expense API

### 5.1 지출 목록 조회

```http
GET /projects/{projectId}/expenses?status=all
GET /projects/{projectId}/expenses?status=needs_review
```

Query:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `status` | `ExpenseStatus | all` | 선택 | 없으면 `all`로 처리 권장 |

응답:

```json
[
  {
    "id": "exp-001",
    "projectId": "project-aingthon",
    "categoryId": "cat-food",
    "date": "2026-05-12",
    "amount": 186000,
    "merchant": "인하분식",
    "description": "운영진 저녁 식사 도시락",
    "payerName": "백승엽",
    "inputChannel": "slack",
    "slackUserId": "U-BKS",
    "status": "approved",
    "evidenceStatus": "verified",
    "evidenceFileId": "evidence-001",
    "aiConfidence": 0.96,
    "missingFields": [],
    "reviewReason": null,
    "createdAt": "2026-05-12T21:10:00+09:00",
    "updatedAt": "2026-05-12T21:20:00+09:00"
  }
]
```

정렬 권장:

- `createdAt` 최신순

프론트 동작:

- TanStack Query가 5초마다 polling
- `needs_review` 상태 행을 강조 표시

### 5.2 지출 수정 후 승인

```http
PATCH /expenses/{expenseId}/approve
```

요청:

```json
{
  "date": "2026-05-12",
  "amount": 186000,
  "categoryId": "cat-food",
  "description": "운영진 저녁 식사 도시락"
}
```

현재 프론트 내부 schema에는 `expenseId`도 포함되어 있지만, REST path를 사용한다면 body에서는 생략 가능하다.

검증 규칙:

- `date`: `YYYY-MM-DD`
- `amount`: 1 이상 정수
- `categoryId`: required string
- `description`: trim 후 2자 이상

응답:

```json
{
  "id": "exp-001",
  "projectId": "project-aingthon",
  "categoryId": "cat-food",
  "date": "2026-05-12",
  "amount": 186000,
  "merchant": "인하분식",
  "description": "운영진 저녁 식사 도시락",
  "payerName": "백승엽",
  "inputChannel": "slack",
  "slackUserId": "U-BKS",
  "status": "approved",
  "evidenceStatus": "verified",
  "evidenceFileId": "evidence-001",
  "aiConfidence": 0.96,
  "missingFields": [],
  "reviewReason": null,
  "createdAt": "2026-05-12T21:10:00+09:00",
  "updatedAt": "2026-05-15T06:30:00Z"
}
```

백엔드 처리 메모:

- 승인 시 `status = "approved"`
- `reviewReason = null`
- `updatedAt` 갱신
- category 존재 여부 검증 필요

### 5.3 지출 반려

```http
PATCH /expenses/{expenseId}/reject
```

요청:

```json
{
  "reason": "증빙 금액과 입력 금액이 일치하지 않습니다."
}
```

검증 규칙:

- `reason`: optional string, trim 권장

응답:

```json
{
  "id": "exp-001",
  "status": "rejected",
  "reviewReason": "증빙 금액과 입력 금액이 일치하지 않습니다.",
  "updatedAt": "2026-05-15T06:30:00Z"
}
```

실제 응답은 전체 `Expense` 객체 반환을 권장한다.

백엔드 처리 메모:

- reason이 없으면 기본값 `관리자 반려` 사용 가능

### 5.4 지출 요약 조회

```http
GET /projects/{projectId}/expense-summary
```

응답:

```json
{
  "projectId": "project-aingthon",
  "totalExpenseCount": 8,
  "needsReviewCount": 2,
  "approvedCount": 4,
  "rejectedCount": 1,
  "missingEvidenceCount": 1,
  "approvedAmount": 486000
}
```

집계 기준:

- `totalExpenseCount`: 프로젝트 전체 지출 수
- `needsReviewCount`: `status === "needs_review"`
- `approvedCount`: `status === "approved"`
- `rejectedCount`: `status === "rejected"`
- `missingEvidenceCount`: `evidenceStatus === "none"`
- `approvedAmount`: `approved` 및 `exported` 상태 금액 합계 권장

---

## 6. Budget Category API

### 6.1 카테고리 목록/예산 현황 조회

```http
GET /projects/{projectId}/budget-categories
```

응답:

```json
[
  {
    "id": "cat-food",
    "projectId": "project-aingthon",
    "name": "식비",
    "budgetLimit": 500000,
    "keywords": ["식사", "뒷풀이", "도시락", "식비"],
    "approvedAmount": 186000,
    "remainingAmount": 314000,
    "usageRate": 37.2,
    "createdAt": "2026-05-03T10:10:00+09:00"
  }
]
```

계산 규칙:

- `approvedAmount`: 해당 카테고리의 `approved`/`exported` 지출 합계
- `remainingAmount`: `budgetLimit - approvedAmount`
- `usageRate`: `(approvedAmount / budgetLimit) * 100`, 소수 1자리 권장
- 예산 초과 시 `remainingAmount`는 음수 허용

### 6.2 카테고리 생성

```http
POST /projects/{projectId}/budget-categories
```

요청:

```json
{
  "name": "다과비",
  "budgetLimit": 200000,
  "keywords": ["간식", "커피", "음료"]
}
```

현재 프론트 내부 schema에는 `projectId`도 포함되어 있지만, REST path를 사용한다면 body에서는 생략 가능하다.

검증 규칙:

- `name`: trim 후 1자 이상
- `budgetLimit`: 0 이상 정수
- `keywords`: string array, trim/deduplicate 권장

응답:

```json
{
  "id": "cat-snack",
  "projectId": "project-aingthon",
  "name": "다과비",
  "budgetLimit": 200000,
  "keywords": ["간식", "커피", "음료"],
  "approvedAmount": 0,
  "remainingAmount": 200000,
  "usageRate": 0,
  "createdAt": "2026-05-15T06:30:00Z"
}
```

### 6.3 카테고리 수정

```http
PATCH /budget-categories/{categoryId}
```

요청:

```json
{
  "name": "운영 다과비",
  "budgetLimit": 250000,
  "keywords": ["간식", "커피", "음료", "다과"]
}
```

응답:

```json
{
  "id": "cat-snack",
  "projectId": "project-aingthon",
  "name": "운영 다과비",
  "budgetLimit": 250000,
  "keywords": ["간식", "커피", "음료", "다과"],
  "approvedAmount": 86000,
  "remainingAmount": 164000,
  "usageRate": 34.4,
  "createdAt": "2026-05-03T10:11:00+09:00"
}
```

---

## 7. Template API

### 7.1 엑셀 양식 업로드/분석 요청

MVP Mock UI는 파일명만 전달하지만, 실제 AWS 전환 시에는 S3 Presigned Upload 흐름을 권장한다.

#### 권장 실제 흐름

```text
1. 프론트가 업로드 URL 요청
2. 백엔드가 S3 Presigned POST/PUT 발급
3. 프론트가 S3에 직접 업로드
4. 백엔드에 업로드 완료/분석 요청
5. 백엔드가 컬럼 매핑 추천 결과 반환
```

#### 현재 프론트와 맞추기 위한 단순 API

```http
POST /projects/{projectId}/template
```

요청:

```json
{
  "fileName": "AINGTHON_지출내역서.xlsx"
}
```

검증 규칙:

- `.xlsx` 또는 `.xls` 확장자만 허용

응답:

```json
{
  "projectId": "project-aingthon",
  "fileName": "AINGTHON_지출내역서.xlsx",
  "uploadStatus": "uploaded",
  "mappingStatus": "suggested",
  "mappings": [
    {
      "sourceColumn": "사용일자",
      "targetField": "date",
      "confidence": 0.94,
      "confirmed": false
    },
    {
      "sourceColumn": "사용처",
      "targetField": "merchant",
      "confidence": 0.9,
      "confirmed": false
    }
  ]
}
```

백엔드 처리 메모:

- 프로젝트의 `templateFileName` 갱신
- 프로젝트의 `templateMappingStatus = "suggested"`
- 분석 결과는 프로젝트별로 저장

### 7.2 엑셀 컬럼 매핑 확정

```http
PATCH /projects/{projectId}/template-mapping
```

요청:

```json
{
  "mappings": [
    {
      "sourceColumn": "사용일자",
      "targetField": "date",
      "confidence": 0.94,
      "confirmed": false
    },
    {
      "sourceColumn": "사용처",
      "targetField": "merchant",
      "confidence": 0.9,
      "confirmed": false
    }
  ]
}
```

응답:

```json
{
  "projectId": "project-aingthon",
  "fileName": "AINGTHON_지출내역서.xlsx",
  "uploadStatus": "uploaded",
  "mappingStatus": "confirmed",
  "mappings": [
    {
      "sourceColumn": "사용일자",
      "targetField": "date",
      "confidence": 0.94,
      "confirmed": true
    },
    {
      "sourceColumn": "사용처",
      "targetField": "merchant",
      "confidence": 0.9,
      "confirmed": true
    }
  ]
}
```

백엔드 처리 메모:

- 모든 mapping의 `confirmed = true`로 저장
- 프로젝트의 `templateMappingStatus = "confirmed"`

---

## 8. Export API

### 8.1 Export job 목록 조회

```http
GET /projects/{projectId}/exports
```

응답:

```json
[
  {
    "id": "export-001",
    "projectId": "project-aingthon",
    "type": "expense_report",
    "status": "completed",
    "includedExpenseCount": 4,
    "excludedReviewCount": 2,
    "downloadUrl": "https://s3-presigned-url.example.com/report.xlsx",
    "expiresAt": "2026-05-16T23:59:59+09:00",
    "createdAt": "2026-05-15T12:00:00+09:00"
  }
]
```

정렬 권장:

- `createdAt` 최신순

### 8.2 지출내역서 생성 요청

```http
POST /projects/{projectId}/exports/expense-report
```

요청 body 없음.

응답:

```json
{
  "id": "export-new",
  "projectId": "project-aingthon",
  "type": "expense_report",
  "status": "completed",
  "includedExpenseCount": 4,
  "excludedReviewCount": 2,
  "downloadUrl": "https://s3-presigned-url.example.com/report.xlsx",
  "expiresAt": "2026-05-16T06:30:00Z",
  "createdAt": "2026-05-15T06:30:00Z"
}
```

백엔드 처리 메모:

- 포함 대상: `status === "approved"` 또는 필요 시 `exported`
- 제외 대상: `status === "needs_review"`
- 생성 완료 후 포함된 지출을 `exported`로 바꿀지 여부는 백엔드 정책으로 결정하되, 프론트 상태값에는 `exported`가 준비되어 있음
- `downloadUrl`은 S3 Presigned URL
- 비동기 생성이 오래 걸리면 최초 응답 `status = "requested" | "generating"` 후 `/exports` polling 방식으로 전환 가능

---

## 9. Slack/Bot → Backend 내부 처리 계약

이 섹션은 프론트가 직접 호출하지 않지만, 백엔드/봇/LLM 팀 간 합의가 필요한 영역이다.

### 9.1 Slack 입력 수신

권장 흐름:

```text
Slack Event/Webhook
→ Webhook Lambda가 3초 이내 접수 응답
→ 원본 메시지/파일 S3 저장
→ Step Functions 비동기 실행
→ LLM/Textract 처리
→ DynamoDB에 Expense/Evidence 저장
→ Slack 완료/검토 필요 메시지 전송
```

### 9.2 Expense 생성 시 필수 필드

Slack/LLM 처리 후 최소 다음 필드를 생성해야 프론트 목록에 표시할 수 있다.

```json
{
  "projectId": "project-aingthon",
  "categoryId": "cat-food",
  "date": "2026-05-12",
  "amount": 186000,
  "merchant": "인하분식",
  "description": "운영진 저녁 식사 도시락",
  "payerName": "백승엽",
  "inputChannel": "slack",
  "slackUserId": "U-BKS",
  "status": "needs_review",
  "evidenceStatus": "uploaded",
  "evidenceFileId": "evidence-001",
  "aiConfidence": 0.72,
  "missingFields": ["categoryId"],
  "reviewReason": "AI 신뢰도가 낮아 검토가 필요합니다."
}
```

### 9.3 needs_review 판정 권장 기준

아래 중 하나라도 해당하면 `needs_review` 권장:

- `aiConfidence`가 팀 기준 미만
- `date`, `amount`, `merchant`, `description`, `payerName`, `categoryId` 중 필수 필드 누락
- `evidenceStatus === "none"` 또는 `ocr_failed`
- 카테고리 예산 초과 가능
- 금액/영수증/설명 간 불일치 탐지

---

## 10. 프론트 연동 우선순위

백엔드가 한 번에 모든 API를 만들기 어렵다면 아래 순서로 제공하면 프론트 연동이 가장 빠르다.

1. `GET /projects`
2. `GET /projects/{projectId}`
3. `GET /projects/{projectId}/expenses?status=all`
4. `GET /projects/{projectId}/expense-summary`
5. `PATCH /expenses/{expenseId}/approve`
6. `PATCH /expenses/{expenseId}/reject`
7. `GET /projects/{projectId}/budget-categories`
8. `POST/PATCH budget-categories`
9. `POST /projects/{projectId}/close`
10. `POST /projects/{projectId}/exports/expense-report`, `GET /projects/{projectId}/exports`
11. Template upload/mapping API
12. Evidence preview/download API

---

## 11. 현재 프론트 Mock 기준 참고 파일

- 도메인 타입: `budgetflow-frontend/src/lib/domain.ts`
- Mock API 구현: `budgetflow-frontend/src/lib/api/budgetflow-api.ts`
- Mock 데이터: `budgetflow-frontend/src/lib/api/mock-data.ts`
- Query hooks: `budgetflow-frontend/src/lib/hooks/use-budgetflow.ts`
- Project schema: `budgetflow-frontend/src/lib/forms/project.ts`
- Expense review schema: `budgetflow-frontend/src/lib/forms/expense-review.ts`
- Budget category schema: `budgetflow-frontend/src/lib/forms/budget-category.ts`
- Template schema: `budgetflow-frontend/src/lib/forms/template.ts`
- Auth placeholder: `budgetflow-frontend/src/lib/auth/auth-api.ts`
