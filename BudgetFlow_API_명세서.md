# BudgetFlow API 명세서

## 1. 총 API 개수

프론트엔드 MVP 연동 기준으로 백엔드 개발자와 협의해야 할 API는 **총 15개**이다.

| 구분 | 개수 |
| --- | ---: |
| Project API | 4개 |
| Expense API | 4개 |
| Budget Category API | 3개 |
| Template API | 2개 |
| Export API | 2개 |
| **합계** | **15개** |

> Slack Event/Webhook 수신 API는 프론트가 직접 호출하지 않는 백엔드/봇 내부 API이므로 위 15개에는 포함하지 않는다.

---

## 2. 공통 규칙

### Base URL

```env
NEXT_PUBLIC_BUDGETFLOW_API_BASE_URL=https://api.example.com
```

### 인증 헤더

```http
Authorization: Bearer <Cognito JWT>
Content-Type: application/json
```

### 공통 에러 응답

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

### 공통 상태값

```ts
ProjectStatus = "active" | "closed";
ExpenseStatus = "created" | "processing" | "needs_review" | "approved" | "rejected" | "exported";
EvidenceStatus = "none" | "uploaded" | "ocr_completed" | "ocr_failed" | "verified";
ExportStatus = "requested" | "generating" | "completed" | "failed" | "expired";
TemplateMappingStatus = "none" | "suggested" | "confirmed";
```

---

## 3. API 목록

| No | Method | Path | 설명 |
| ---: | --- | --- | --- |
| 1 | GET | `/projects` | 프로젝트 목록 조회 |
| 2 | GET | `/projects/{projectId}` | 프로젝트 단건 조회 |
| 3 | POST | `/projects` | 프로젝트 생성 |
| 4 | POST | `/projects/{projectId}/close` | 정산 마감 |
| 5 | GET | `/projects/{projectId}/expenses?status=` | 지출 목록 조회 |
| 6 | PATCH | `/expenses/{expenseId}/approve` | 지출 수정 후 승인 |
| 7 | PATCH | `/expenses/{expenseId}/reject` | 지출 반려 |
| 8 | GET | `/projects/{projectId}/expense-summary` | 지출 요약 조회 |
| 9 | GET | `/projects/{projectId}/budget-categories` | 예산 카테고리 목록 조회 |
| 10 | POST | `/projects/{projectId}/budget-categories` | 예산 카테고리 생성 |
| 11 | PATCH | `/budget-categories/{categoryId}` | 예산 카테고리 수정 |
| 12 | POST | `/projects/{projectId}/template` | 엑셀 양식 업로드/분석 요청 |
| 13 | PATCH | `/projects/{projectId}/template-mapping` | 엑셀 컬럼 매핑 확정 |
| 14 | GET | `/projects/{projectId}/exports` | Export job 목록 조회 |
| 15 | POST | `/projects/{projectId}/exports/expense-report` | 지출내역서 엑셀 생성 요청 |

---

## 4. Project API

### 1) 프로젝트 목록 조회

```http
GET /projects
```

Response `200`

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

---

### 2) 프로젝트 단건 조회

```http
GET /projects/{projectId}
```

Response `200`

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

---

### 3) 프로젝트 생성

```http
POST /projects
```

Request

```json
{
  "organizationId": "org-gdgoc",
  "name": "AINGTHON 운영 예산",
  "totalBudget": 1200000,
  "slackChannelName": "#aingthon-budget",
  "templateFileName": "AINGTHON_지출내역서.xlsx"
}
```

Response `201`

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

Validation

- `name`: 2자 이상
- `totalBudget`: 1 이상 정수
- `slackChannelName`: `#` 선택 허용, 영문/숫자/하이픈/언더스코어 허용

---

### 4) 정산 마감

```http
POST /projects/{projectId}/close
```

Request body 없음

Response `200`

```json
{
  "id": "project-aingthon",
  "organizationId": "org-gdgoc",
  "name": "AINGTHON 운영 예산",
  "totalBudget": 1200000,
  "status": "closed",
  "slackChannelId": "C-AINGTHON",
  "slackChannelName": "aingthon-budget",
  "templateFileName": "AINGTHON_지출내역서.xlsx",
  "templateMappingStatus": "confirmed",
  "createdAt": "2026-05-03T10:00:00+09:00",
  "closedAt": "2026-05-15T06:30:00Z"
}
```

---

## 5. Expense API

### 5) 지출 목록 조회

```http
GET /projects/{projectId}/expenses?status=all
```

Query

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `status` | `all | created | processing | needs_review | approved | rejected | exported` | 상태 필터. 생략 시 `all` |

Response `200`

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

Notes

- 프론트는 이 API를 5초 polling한다.
- `needs_review` 상태는 프론트에서 강조 표시된다.

---

### 6) 지출 수정 후 승인

```http
PATCH /expenses/{expenseId}/approve
```

Request

```json
{
  "date": "2026-05-12",
  "amount": 186000,
  "categoryId": "cat-food",
  "description": "운영진 저녁 식사 도시락"
}
```

Response `200`

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

Validation

- `date`: `YYYY-MM-DD`
- `amount`: 1 이상 정수
- `categoryId`: 필수
- `description`: 2자 이상

---

### 7) 지출 반려

```http
PATCH /expenses/{expenseId}/reject
```

Request

```json
{
  "reason": "증빙 금액과 입력 금액이 일치하지 않습니다."
}
```

Response `200`

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
  "status": "rejected",
  "evidenceStatus": "verified",
  "evidenceFileId": "evidence-001",
  "aiConfidence": 0.96,
  "missingFields": [],
  "reviewReason": "증빙 금액과 입력 금액이 일치하지 않습니다.",
  "createdAt": "2026-05-12T21:10:00+09:00",
  "updatedAt": "2026-05-15T06:30:00Z"
}
```

---

### 8) 지출 요약 조회

```http
GET /projects/{projectId}/expense-summary
```

Response `200`

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

---

## 6. Budget Category API

### 9) 예산 카테고리 목록 조회

```http
GET /projects/{projectId}/budget-categories
```

Response `200`

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

---

### 10) 예산 카테고리 생성

```http
POST /projects/{projectId}/budget-categories
```

Request

```json
{
  "name": "다과비",
  "budgetLimit": 200000,
  "keywords": ["간식", "커피", "음료"]
}
```

Response `201`

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

---

### 11) 예산 카테고리 수정

```http
PATCH /budget-categories/{categoryId}
```

Request

```json
{
  "name": "운영 다과비",
  "budgetLimit": 250000,
  "keywords": ["간식", "커피", "음료", "다과"]
}
```

Response `200`

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

### 12) 엑셀 양식 업로드/분석 요청

```http
POST /projects/{projectId}/template
```

Request

```json
{
  "fileName": "AINGTHON_지출내역서.xlsx"
}
```

Response `200`

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

Notes

- MVP Mock은 `fileName`만 전달한다.
- 실제 AWS 구현에서는 S3 Presigned Upload로 분리 가능하다.

---

### 13) 엑셀 컬럼 매핑 확정

```http
PATCH /projects/{projectId}/template-mapping
```

Request

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

Response `200`

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

---

## 8. Export API

### 14) Export job 목록 조회

```http
GET /projects/{projectId}/exports
```

Response `200`

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

---

### 15) 지출내역서 엑셀 생성 요청

```http
POST /projects/{projectId}/exports/expense-report
```

Request body 없음

Response `200`

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

Rules

- 포함 대상: `approved` 상태 지출
- 제외 대상: `needs_review`, `rejected`, `processing` 상태 지출
- `downloadUrl`: S3 Presigned URL
- 오래 걸리면 `requested` 또는 `generating` 상태 반환 후 14번 API로 polling 가능

---

## 9. 백엔드 구현 우선순위

1. `GET /projects`
2. `GET /projects/{projectId}`
3. `GET /projects/{projectId}/expenses?status=all`
4. `GET /projects/{projectId}/expense-summary`
5. `PATCH /expenses/{expenseId}/approve`
6. `PATCH /expenses/{expenseId}/reject`
7. `GET /projects/{projectId}/budget-categories`
8. `POST /projects/{projectId}/budget-categories`
9. `PATCH /budget-categories/{categoryId}`
10. `POST /projects/{projectId}/close`
11. `GET /projects/{projectId}/exports`
12. `POST /projects/{projectId}/exports/expense-report`
13. `POST /projects/{projectId}/template`
14. `PATCH /projects/{projectId}/template-mapping`
15. `POST /projects`

---

## 10. 후속 협의가 필요한 내부 API/Event

아래는 프론트 직접 호출 API에는 포함하지 않았지만 백엔드/봇 개발자와 별도 협의가 필요하다.

| 구분 | 내용 |
| --- | --- |
| Slack Event 수신 | Slack Webhook/Event API를 Lambda가 수신 |
| 원본 파일 저장 | Slack 첨부 파일/이미지 S3 저장 |
| 비동기 분석 실행 | Step Functions 또는 Queue 기반 분석 시작 |
| OCR/LLM 결과 저장 | Expense, EvidenceFile 생성/갱신 |
| Slack 완료 알림 | 분석 완료 또는 needs_review 알림 메시지 발송 |
| S3 Presigned Upload | 실제 템플릿/증빙 파일 업로드 방식 확정 |
