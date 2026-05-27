# BudgetFlow API 명세서

## 1. 문서 범위

| 항목 | 내용 |
| --- | --- |
| 목적 | BudgetFlow 프론트엔드 MVP와 백엔드 간 API 계약 정의 |
| 기준 | `budgetflow-frontend/src/lib/domain.ts`, `budgetflow-frontend/src/lib/api/budgetflow-api.ts`, form schema |
| 형식 | 예시 payload 없이 표 기반으로 요청/응답 스키마와 규칙만 정의 |
| 포함 API | 프론트엔드가 직접 호출하는 Project, Expense, Budget Category, Template, Export API |
| 제외 API | Slack Event/Webhook 수신, OCR/LLM 비동기 처리, S3 원본 파일 저장 등 백엔드/봇 내부 API |

---

## 2. 전체 API 개수

| 구분 | 개수 | 비고 |
| --- | ---: | --- |
| Project API | 4 | 프로젝트 목록/상세/생성/마감 |
| Expense API | 4 | 지출 목록/승인/반려/요약 |
| Budget Category API | 3 | 예산 카테고리 목록/생성/수정 |
| Template API | 2 | 엑셀 양식 업로드/분석, 매핑 확정 |
| Export API | 2 | Export job 목록, 지출내역서 생성 |
| **합계** | **15** | 프론트 직접 호출 기준 |

---

## 3. 공통 규칙

### 3.1 Base URL 및 인증

| 항목 | 값/규칙 |
| --- | --- |
| Base URL 환경 변수 | `NEXT_PUBLIC_BUDGETFLOW_API_BASE_URL` |
| 인증 방식 | Cognito JWT Bearer 인증 권장 |
| 인증 헤더 | `Authorization: Bearer <Cognito JWT>` |
| Content-Type | `application/json` |
| 성공 응답 형식 | 리소스 객체 또는 리소스 배열을 직접 반환 |
| 에러 응답 형식 | `ErrorResponse` 객체 반환 |

### 3.2 공통 데이터 규칙

| 항목 | 규칙 |
| --- | --- |
| 시간 | ISO 8601 string |
| 날짜 | `YYYY-MM-DD` string |
| 금액 | 원 단위 정수 `number` |
| AI 신뢰도 | `0` 이상 `1` 이하 `number` |
| 목록 정렬 | 생성일 최신순 권장. 프로젝트 목록은 active 우선 후 생성일 최신순 |
| Polling | 지출 목록은 프론트에서 5초 간격 polling |
| 존재하지 않는 리소스 | `404 Not Found` 권장 |
| 입력 검증 실패 | `400 Bad Request` 또는 `422 Unprocessable Entity` 권장 |
| 인증 실패 | `401 Unauthorized` |
| 권한 없음 | `403 Forbidden` |

### 3.3 ErrorResponse 스키마

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `error` | `object` | Y | 에러 본문 |
| `error.code` | `string` | Y | 기계가 읽을 수 있는 에러 코드 |
| `error.message` | `string` | Y | 사용자 표시 가능 메시지 |
| `error.details` | `ErrorDetail[]` | N | 필드 단위 상세 오류 목록 |

### 3.4 ErrorDetail 스키마

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `field` | `string` | N | 오류가 발생한 필드명 |
| `message` | `string` | Y | 상세 오류 메시지 |

---

## 4. 상태값 및 열거형

| 타입명 | 허용값 |
| --- | --- |
| `ProjectStatus` | `active`, `closed` |
| `ExpenseStatus` | `created`, `processing`, `needs_review`, `approved`, `rejected`, `exported` |
| `EvidenceStatus` | `none`, `uploaded`, `ocr_completed`, `ocr_failed`, `verified` |
| `ExportStatus` | `requested`, `generating`, `completed`, `failed`, `expired` |
| `TemplateMappingStatus` | `none`, `suggested`, `confirmed` |
| `TemplateField` | `date`, `merchant`, `description`, `category`, `amount`, `payerName`, `evidence` |
| `ExportJob.type` | `budget_plan`, `expense_report` |
| `EvidenceFile.fileType` | `image`, `pdf`, `xlsx` |
| `Expense.inputChannel` | `slack` |

---

## 5. 도메인 객체 스키마

### 5.1 Project

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | Y | 프로젝트 ID |
| `organizationId` | `string` | Y | 조직 ID |
| `name` | `string` | Y | 프로젝트명 |
| `totalBudget` | `number` | Y | 총 예산 |
| `status` | `ProjectStatus` | Y | 프로젝트 상태 |
| `slackChannelId` | `string` | Y | Slack 채널 ID |
| `slackChannelName` | `string` | Y | Slack 채널명 |
| `templateFileName` | `string \| null` | Y | 업로드된 엑셀 양식 파일명 |
| `templateMappingStatus` | `TemplateMappingStatus` | Y | 엑셀 컬럼 매핑 상태 |
| `createdAt` | `string` | Y | 생성 시각 |
| `closedAt` | `string \| null` | Y | 마감 시각 |

### 5.2 Expense

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | Y | 지출 ID |
| `projectId` | `string` | Y | 프로젝트 ID |
| `categoryId` | `string` | Y | 예산 카테고리 ID |
| `date` | `string` | Y | 사용일 |
| `amount` | `number` | Y | 지출 금액 |
| `merchant` | `string` | Y | 사용처 |
| `description` | `string` | Y | 지출 설명 |
| `payerName` | `string` | Y | 결제자 |
| `inputChannel` | `slack` | Y | 입력 채널 |
| `slackUserId` | `string` | Y | Slack 사용자 ID |
| `status` | `ExpenseStatus` | Y | 지출 상태 |
| `evidenceStatus` | `EvidenceStatus` | Y | 증빙/OCR 상태 |
| `evidenceFileId` | `string \| null` | Y | 증빙 파일 ID |
| `aiConfidence` | `number` | Y | AI 추출 신뢰도 |
| `missingFields` | `string[]` | Y | 누락 또는 검토 필요 필드 목록 |
| `reviewReason` | `string \| null` | Y | 검토/반려 사유 |
| `createdAt` | `string` | Y | 생성 시각 |
| `updatedAt` | `string` | Y | 수정 시각 |

### 5.3 BudgetCategory

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | Y | 카테고리 ID |
| `projectId` | `string` | Y | 프로젝트 ID |
| `name` | `string` | Y | 카테고리명 |
| `budgetLimit` | `number` | Y | 예산 한도 |
| `keywords` | `string[]` | Y | 자동 분류 키워드 |
| `approvedAmount` | `number` | Y | 승인/내보내기 완료 지출 합계 |
| `remainingAmount` | `number` | Y | 잔여 예산. 초과 시 음수 허용 |
| `usageRate` | `number` | Y | 예산 사용률. 소수 1자리 권장 |
| `createdAt` | `string` | Y | 생성 시각 |

### 5.4 ExpenseSummary

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 프로젝트 ID |
| `totalExpenseCount` | `number` | Y | 전체 지출 건수 |
| `needsReviewCount` | `number` | Y | 검토 필요 지출 건수 |
| `approvedCount` | `number` | Y | 승인 지출 건수 |
| `rejectedCount` | `number` | Y | 반려 지출 건수 |
| `missingEvidenceCount` | `number` | Y | 증빙 없음 건수 |
| `approvedAmount` | `number` | Y | 승인/내보내기 완료 지출 합계 |

### 5.5 TemplateMappingSuggestion

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `sourceColumn` | `string` | Y | 엑셀 원본 컬럼명 |
| `targetField` | `TemplateField` | Y | BudgetFlow 대상 필드 |
| `confidence` | `number` | Y | 매핑 추천 신뢰도 |
| `confirmed` | `boolean` | Y | 사용자 확정 여부 |

### 5.6 TemplateUploadResult

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 프로젝트 ID |
| `fileName` | `string` | Y | 엑셀 양식 파일명 |
| `uploadStatus` | `uploaded` | Y | 업로드 상태 |
| `mappingStatus` | `suggested \| confirmed` | Y | 매핑 상태 |
| `mappings` | `TemplateMappingSuggestion[]` | Y | 컬럼 매핑 목록 |

### 5.7 ExportJob

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | Y | Export job ID |
| `projectId` | `string` | Y | 프로젝트 ID |
| `type` | `budget_plan \| expense_report` | Y | Export 유형 |
| `status` | `ExportStatus` | Y | Export 상태 |
| `includedExpenseCount` | `number` | Y | 내보내기에 포함된 지출 건수 |
| `excludedReviewCount` | `number` | Y | 검토 필요로 제외된 지출 건수 |
| `downloadUrl` | `string \| null` | Y | 다운로드 URL. 완료 전에는 null 가능 |
| `expiresAt` | `string \| null` | Y | 다운로드 URL 만료 시각 |
| `createdAt` | `string` | Y | 생성 시각 |

### 5.8 EvidenceFile

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | Y | 증빙 파일 ID |
| `projectId` | `string` | Y | 프로젝트 ID |
| `expenseId` | `string` | Y | 지출 ID |
| `fileName` | `string` | Y | 파일명 |
| `fileType` | `image \| pdf \| xlsx` | Y | 파일 유형 |
| `url` | `string` | Y | 접근 URL 또는 Presigned URL |
| `ocrStatus` | `EvidenceStatus` | Y | OCR 상태 |
| `createdAt` | `string` | Y | 생성 시각 |

---

## 6. API 목록 요약

| No | 구분 | Method | Path | 목적 | 프론트 화면 | 성공 코드 | 응답 타입 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | Project | GET | `/projects` | 프로젝트 목록 조회 | `/projects` | 200 | `Project[]` |
| 2 | Project | GET | `/projects/{projectId}` | 프로젝트 단건 조회 | `/expenses`, `/settings` | 200 | `Project` |
| 3 | Project | POST | `/projects` | 프로젝트 생성 | `/projects` | 201 | `Project` |
| 4 | Project | POST | `/projects/{projectId}/close` | 정산 마감 | `/expenses` | 200 | `Project` |
| 5 | Expense | GET | `/projects/{projectId}/expenses` | 지출 목록 조회/필터 | `/expenses` | 200 | `Expense[]` |
| 6 | Expense | PATCH | `/expenses/{expenseId}/approve` | 지출 수정 후 승인 | `/expenses` | 200 | `Expense` |
| 7 | Expense | PATCH | `/expenses/{expenseId}/reject` | 지출 반려 | `/expenses` | 200 | `Expense` |
| 8 | Expense | GET | `/projects/{projectId}/expense-summary` | 지출 요약 조회 | `/expenses` | 200 | `ExpenseSummary` |
| 9 | Budget Category | GET | `/projects/{projectId}/budget-categories` | 카테고리 목록/예산 현황 조회 | `/settings`, `/expenses` | 200 | `BudgetCategory[]` |
| 10 | Budget Category | POST | `/projects/{projectId}/budget-categories` | 카테고리 생성 | `/settings` | 201 | `BudgetCategory` |
| 11 | Budget Category | PATCH | `/budget-categories/{categoryId}` | 카테고리 수정 | `/settings` | 200 | `BudgetCategory` |
| 12 | Template | POST | `/projects/{projectId}/template` | 엑셀 양식 업로드/분석 요청 | `/settings` | 200 | `TemplateUploadResult` |
| 13 | Template | PATCH | `/projects/{projectId}/template-mapping` | 엑셀 컬럼 매핑 확정 | `/settings` | 200 | `TemplateUploadResult` |
| 14 | Export | GET | `/projects/{projectId}/exports` | Export job 목록 조회 | `/expenses` | 200 | `ExportJob[]` |
| 15 | Export | POST | `/projects/{projectId}/exports/expense-report` | 지출내역서 엑셀 생성 요청 | `/expenses` | 200 또는 202 | `ExportJob` |

---

## 7. Project API 상세

### 7.1 프로젝트 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Path | `/projects` |
| 인증 | 필요 |
| Request body | 없음 |
| Query | 없음 |
| 성공 코드 | 200 |
| 응답 타입 | `Project[]` |
| 정렬 | `active` 상태 우선, 같은 상태 내 `createdAt` 최신순 권장 |

### 7.2 프로젝트 단건 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Path | `/projects/{projectId}` |
| 인증 | 필요 |
| Request body | 없음 |
| Query | 없음 |
| 성공 코드 | 200 |
| 응답 타입 | `Project` |
| 리소스 없음 | 404 |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 조회할 프로젝트 ID |

### 7.3 프로젝트 생성

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Path | `/projects` |
| 인증 | 필요 |
| 성공 코드 | 201 |
| 응답 타입 | `Project` |

| Request field | 타입 | 필수 | 검증/규칙 |
| --- | --- | --- | --- |
| `organizationId` | `string` | Y | 빈 문자열 불가 |
| `name` | `string` | Y | trim 후 2자 이상 |
| `totalBudget` | `number` | Y | 1 이상 정수 |
| `slackChannelName` | `string` | Y | `#` 선택 허용, 영문/숫자/하이픈/언더스코어 허용 |
| `templateFileName` | `string` | N | 없거나 공백이면 null 처리 권장 |

| 처리 규칙 | 내용 |
| --- | --- |
| Slack 채널명 저장 | 앞의 `#` 제거 권장 |
| 초기 상태 | `status = active` |
| 템플릿 파일명 없음 | `templateMappingStatus = none` |
| 템플릿 파일명 있음 | `templateMappingStatus = suggested` 권장 |

### 7.4 정산 마감

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Path | `/projects/{projectId}/close` |
| 인증 | 필요 |
| Request body | 없음 |
| 성공 코드 | 200 |
| 응답 타입 | `Project` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 마감할 프로젝트 ID |

| 처리 규칙 | 내용 |
| --- | --- |
| 상태 변경 | `status = closed` |
| 마감 시각 | `closedAt` 갱신 |
| 중복 요청 | 이미 closed인 경우 idempotent하게 closed project 반환 권장 |
| Slack 입력 정책 | 마감 후 입력 차단 여부는 백엔드/봇 정책으로 결정 |

---

## 8. Expense API 상세

### 8.1 지출 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Path | `/projects/{projectId}/expenses` |
| 인증 | 필요 |
| Request body | 없음 |
| 성공 코드 | 200 |
| 응답 타입 | `Expense[]` |
| 정렬 | `createdAt` 최신순 권장 |
| 프론트 동작 | 5초 간격 polling |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 지출을 조회할 프로젝트 ID |

| Query parameter | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `status` | `ExpenseStatus \| all` | N | `all` | 지출 상태 필터 |

| UI 규칙 | 내용 |
| --- | --- |
| 강조 표시 | `needs_review` 상태 행은 프론트에서 강조 표시 |

### 8.2 지출 수정 후 승인

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Path | `/expenses/{expenseId}/approve` |
| 인증 | 필요 |
| 성공 코드 | 200 |
| 응답 타입 | `Expense` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `expenseId` | `string` | Y | 승인할 지출 ID |

| Request field | 타입 | 필수 | 검증/규칙 |
| --- | --- | --- | --- |
| `date` | `string` | Y | `YYYY-MM-DD` |
| `amount` | `number` | Y | 1 이상 정수 |
| `categoryId` | `string` | Y | 존재하는 카테고리 ID 검증 필요 |
| `description` | `string` | Y | trim 후 2자 이상 |

| 처리 규칙 | 내용 |
| --- | --- |
| 상태 변경 | `status = approved` |
| 반려/검토 사유 | `reviewReason = null` |
| 수정 시각 | `updatedAt` 갱신 |
| REST body | path에 `expenseId`가 있으므로 body의 `expenseId`는 생략 권장 |

### 8.3 지출 반려

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Path | `/expenses/{expenseId}/reject` |
| 인증 | 필요 |
| 성공 코드 | 200 |
| 응답 타입 | `Expense` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `expenseId` | `string` | Y | 반려할 지출 ID |

| Request field | 타입 | 필수 | 검증/규칙 |
| --- | --- | --- | --- |
| `reason` | `string` | N | trim 권장. 없으면 기본 반려 사유 사용 가능 |

| 처리 규칙 | 내용 |
| --- | --- |
| 상태 변경 | `status = rejected` |
| 반려 사유 | `reviewReason`에 저장 |
| 기본 사유 | reason이 없으면 `관리자 반려` 사용 가능 |
| 수정 시각 | `updatedAt` 갱신 |

### 8.4 지출 요약 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Path | `/projects/{projectId}/expense-summary` |
| 인증 | 필요 |
| Request body | 없음 |
| Query | 없음 |
| 성공 코드 | 200 |
| 응답 타입 | `ExpenseSummary` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 요약을 조회할 프로젝트 ID |

| 집계 필드 | 기준 |
| --- | --- |
| `totalExpenseCount` | 프로젝트 전체 지출 수 |
| `needsReviewCount` | `status = needs_review` |
| `approvedCount` | `status = approved` |
| `rejectedCount` | `status = rejected` |
| `missingEvidenceCount` | `evidenceStatus = none` |
| `approvedAmount` | `status = approved` 또는 `exported`인 지출 금액 합계 권장 |

---

## 9. Budget Category API 상세

### 9.1 예산 카테고리 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Path | `/projects/{projectId}/budget-categories` |
| 인증 | 필요 |
| Request body | 없음 |
| Query | 없음 |
| 성공 코드 | 200 |
| 응답 타입 | `BudgetCategory[]` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 카테고리를 조회할 프로젝트 ID |

| 계산 필드 | 기준 |
| --- | --- |
| `approvedAmount` | 해당 카테고리의 `approved`/`exported` 지출 합계 |
| `remainingAmount` | `budgetLimit - approvedAmount` |
| `usageRate` | `(approvedAmount / budgetLimit) * 100`, 소수 1자리 권장 |

### 9.2 예산 카테고리 생성

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Path | `/projects/{projectId}/budget-categories` |
| 인증 | 필요 |
| 성공 코드 | 201 |
| 응답 타입 | `BudgetCategory` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 카테고리를 생성할 프로젝트 ID |

| Request field | 타입 | 필수 | 검증/규칙 |
| --- | --- | --- | --- |
| `name` | `string` | Y | trim 후 1자 이상 |
| `budgetLimit` | `number` | Y | 0 이상 정수 |
| `keywords` | `string[]` | N | trim, 빈 문자열 제거, 중복 제거 권장 |

| 처리 규칙 | 내용 |
| --- | --- |
| REST body | path에 `projectId`가 있으므로 body의 `projectId`는 생략 권장 |
| 초기 계산값 | `approvedAmount = 0`, `remainingAmount = budgetLimit`, `usageRate = 0` |

### 9.3 예산 카테고리 수정

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Path | `/budget-categories/{categoryId}` |
| 인증 | 필요 |
| 성공 코드 | 200 |
| 응답 타입 | `BudgetCategory` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `categoryId` | `string` | Y | 수정할 카테고리 ID |

| Request field | 타입 | 필수 | 검증/규칙 |
| --- | --- | --- | --- |
| `name` | `string` | Y | trim 후 1자 이상 |
| `budgetLimit` | `number` | Y | 0 이상 정수 |
| `keywords` | `string[]` | N | trim, 빈 문자열 제거, 중복 제거 권장 |

| 처리 규칙 | 내용 |
| --- | --- |
| 계산값 재산출 | 수정 후 `approvedAmount`, `remainingAmount`, `usageRate` 재계산 |

---

## 10. Template API 상세

### 10.1 엑셀 양식 업로드/분석 요청

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Path | `/projects/{projectId}/template` |
| 인증 | 필요 |
| 성공 코드 | 200 |
| 응답 타입 | `TemplateUploadResult` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 템플릿을 업로드할 프로젝트 ID |

| Request field | 타입 | 필수 | 검증/규칙 |
| --- | --- | --- | --- |
| `fileName` | `string` | Y | trim 후 1자 이상, `.xlsx` 또는 `.xls` 확장자 |

| 처리 규칙 | 내용 |
| --- | --- |
| MVP 방식 | 파일명만 전달하는 단순 API |
| 실제 AWS 전환 | S3 Presigned Upload 흐름으로 분리 가능 |
| 프로젝트 갱신 | `templateFileName` 갱신 |
| 매핑 상태 | `templateMappingStatus = suggested` |
| 응답 매핑 | 추천 컬럼 매핑 목록 반환 |

### 10.2 엑셀 컬럼 매핑 확정

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Path | `/projects/{projectId}/template-mapping` |
| 인증 | 필요 |
| 성공 코드 | 200 |
| 응답 타입 | `TemplateUploadResult` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 매핑을 확정할 프로젝트 ID |

| Request field | 타입 | 필수 | 검증/규칙 |
| --- | --- | --- | --- |
| `mappings` | `TemplateMappingSuggestion[]` | Y | 1개 이상 |

| Mapping field | 타입 | 필수 | 검증/규칙 |
| --- | --- | --- | --- |
| `sourceColumn` | `string` | Y | trim 후 1자 이상 |
| `targetField` | `TemplateField` | Y | 허용값만 가능 |
| `confidence` | `number` | Y | 0 이상 1 이하 |
| `confirmed` | `boolean` | Y | 요청값과 무관하게 확정 처리 가능 |

| 처리 규칙 | 내용 |
| --- | --- |
| 매핑 확정 | 모든 mapping의 `confirmed = true`로 저장 권장 |
| 프로젝트 갱신 | `templateMappingStatus = confirmed` |
| 응답 상태 | `mappingStatus = confirmed` |

---

## 11. Export API 상세

### 11.1 Export job 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Path | `/projects/{projectId}/exports` |
| 인증 | 필요 |
| Request body | 없음 |
| Query | 없음 |
| 성공 코드 | 200 |
| 응답 타입 | `ExportJob[]` |
| 정렬 | `createdAt` 최신순 권장 |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | Export job을 조회할 프로젝트 ID |

### 11.2 지출내역서 엑셀 생성 요청

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Path | `/projects/{projectId}/exports/expense-report` |
| 인증 | 필요 |
| Request body | 없음 |
| 성공 코드 | 200 또는 202 |
| 응답 타입 | `ExportJob` |

| Path parameter | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `projectId` | `string` | Y | 지출내역서를 생성할 프로젝트 ID |

| 처리 규칙 | 내용 |
| --- | --- |
| 포함 대상 | `status = approved` 지출. 필요 시 `exported` 포함 가능 |
| 제외 대상 | `needs_review`, `rejected`, `processing` 상태 지출 |
| 다운로드 URL | S3 Presigned URL 반환 권장 |
| 빠른 생성 | 생성 완료 시 `status = completed`, `downloadUrl` 포함 |
| 비동기 생성 | 오래 걸리면 `status = requested` 또는 `generating` 반환 후 목록 API polling |
| Export 후 상태 변경 | 포함된 지출을 `exported`로 바꿀지 여부는 백엔드 정책으로 결정 |

---

## 12. 백엔드 구현 우선순위

| 우선순위 | Method | Path | 이유 |
| ---: | --- | --- | --- |
| 1 | GET | `/projects` | 진입 화면 필수 |
| 2 | GET | `/projects/{projectId}` | 상세/설정 화면 필수 |
| 3 | GET | `/projects/{projectId}/expenses` | 핵심 지출 목록 필수 |
| 4 | GET | `/projects/{projectId}/expense-summary` | 대시보드 요약 필수 |
| 5 | PATCH | `/expenses/{expenseId}/approve` | 관리자 검토 핵심 기능 |
| 6 | PATCH | `/expenses/{expenseId}/reject` | 관리자 검토 핵심 기능 |
| 7 | GET | `/projects/{projectId}/budget-categories` | 지출 승인/설정 화면 필수 |
| 8 | POST | `/projects/{projectId}/budget-categories` | 설정 화면 카테고리 관리 |
| 9 | PATCH | `/budget-categories/{categoryId}` | 설정 화면 카테고리 관리 |
| 10 | POST | `/projects/{projectId}/close` | 정산 마감 기능 |
| 11 | GET | `/projects/{projectId}/exports` | Export 결과 확인 |
| 12 | POST | `/projects/{projectId}/exports/expense-report` | 지출내역서 생성 |
| 13 | POST | `/projects/{projectId}/template` | 엑셀 양식 분석 |
| 14 | PATCH | `/projects/{projectId}/template-mapping` | 엑셀 매핑 확정 |
| 15 | POST | `/projects` | 새 프로젝트 생성 |

---

## 13. 후속 협의가 필요한 내부 API/Event

| 구분 | 협의 내용 | 프론트 직접 호출 여부 |
| --- | --- | --- |
| Slack Event 수신 | Slack Webhook/Event API를 Lambda가 수신 | N |
| 원본 파일 저장 | Slack 첨부 파일/이미지 S3 저장 | N |
| 비동기 분석 실행 | Step Functions 또는 Queue 기반 분석 시작 | N |
| OCR/LLM 결과 저장 | Expense, EvidenceFile 생성/갱신 | N |
| Slack 완료 알림 | 분석 완료 또는 검토 필요 알림 메시지 발송 | N |
| S3 Presigned Upload | 실제 템플릿/증빙 파일 업로드 방식 확정 | 필요 시 별도 API |
| Evidence preview/download | 증빙 미리보기/다운로드 API | MVP 이후 협의 |

