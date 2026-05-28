# BudgetFlow LLM Lambda 출력 스키마 v4

> v3 기준으로 아래 사항을 추가 반영했습니다.
> - 입력/출력 필드 정의 테이블 복원 (v3에서 누락)
> - 텍스트/OCR 신뢰도 계산 규칙 테이블 복원
> - missingFields 허용값 테이블 복원
> - 텍스트 파싱 테스트 케이스 복원
> - categoryId / categoryName 동기화 규칙 구체화

---

## 1. 공통 규칙

### 1.1 amount 정규화 규칙

LLM 또는 OCR이 추출한 금액은 아래 규칙에 따라 정규화합니다.

| 규칙 | 설명 |
|---|---|
| 쉼표 제거 | `"32,000원"` → `32000` |
| 원 단위 정수 저장 | 소수점 금지 |
| 음수 금지 | 환불/취소는 MVP 범위 제외 |
| 문자열 금지 | number 타입으로 변환 후 저장 |

---

### 1.2 categoryId / categoryName 동기화 규칙

| 규칙 | 설명 |
|---|---|
| `categoryId == null` | `categoryName`도 반드시 null |
| `categoryId != null` | `categoryName`은 입력으로 받은 `categories` 배열 중 해당 id의 `name` 값 |

---

### 1.3 category 분류 동점 처리 규칙

복수의 카테고리가 동일 점수로 매칭되는 경우 아래 규칙을 따릅니다.

| 조건 | 처리 |
|---|---|
| 동점 카테고리 2개 이상 | `categoryId = null`, `categoryName = null` |
| `categoryId == null` | `missingFields`에 `category` 추가, `needsReview = true` |

---

### 1.4 missingFields / reviewReason 역할 차이

| 필드 | 목적 |
|---|---|
| `missingFields` | 기계적 누락 필드 목록. 프론트 입력 강조/뱃지 표시용 |
| `reviewReason` | 관리자에게 보여줄 자연어 검토 사유 |

예시:

```json
{
  "missingFields": ["merchant"],
  "reviewReason": "사용처 정보가 확인되지 않았습니다."
}
```

---

### 1.5 reviewReason 규칙

| 조건 | 규칙 |
|---|---|
| `needsReview == false` | `reviewReason = null` |
| `needsReview == true` | 최소 1개 이상의 검토 사유 포함 |

---

### 1.6 missingFields 허용값

| 값 | 의미 |
|---|---|
| `date` | 사용일 추출 실패 |
| `amount` | 금액 추출 실패 |
| `merchant` | 사용처 추출 실패 |
| `category` | 카테고리 분류 실패 |
| `payerName` | 결제자 추출 실패 |
| `evidence` | 증빙 없음 (텍스트 파싱 전용) |

---

## 2. 텍스트 파싱 Lambda

사용자가 슬랙에 입력한 자연어 텍스트를 분석하여 지출 데이터로 변환합니다.

### 입력 예시

```json
{
  "inputType": "text",
  "text": "어제 행사 다과 32,000원",
  "projectId": "proj_abc123",
  "requestDate": "2026-05-17",
  "timezone": "Asia/Seoul",
  "submittedBy": {
    "userId": "U12345",
    "displayName": "진수연"
  },
  "categories": [
    { "id": "cat_01", "name": "다과비", "keywords": ["간식", "음료", "다과", "케이터링"] },
    { "id": "cat_02", "name": "식비",   "keywords": ["식사", "밥", "점심", "저녁"] }
  ]
}
```

### 입력 필드 정의

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `inputType` | `"text"` | Y | 입력 유형 식별자 |
| `text` | `string` | Y | 사용자 원문 입력 |
| `projectId` | `string` | Y | 프로젝트 ID |
| `requestDate` | `string` | Y | 날짜 상대 표현 계산 기준 (`YYYY-MM-DD`) |
| `timezone` | `string` | Y | 시간대 (`Asia/Seoul`) |
| `submittedBy.userId` | `string` | Y | Slack 사용자 ID |
| `submittedBy.displayName` | `string` | Y | Slack 표시 이름 |
| `categories` | `Category[]` | Y | 프로젝트 카테고리 목록 |

---

### 출력 예시

```json
{
  "inputType": "text",
  "date": "2026-05-16",
  "amount": 32000,
  "merchant": null,
  "description": "행사 다과",
  "categoryId": "cat_01",
  "categoryName": "다과비",
  "payerName": null,
  "evidenceStatus": "none",
  "evidenceFileId": null,
  "aiConfidence": 0.7,
  "needsReview": true,
  "missingFields": ["merchant", "payerName", "evidence"],
  "reviewReason": "사용처 미확인, 결제자 정보 없음, 증빙 없음",
  "rawInput": "어제 행사 다과 32,000원"
  "reviewCode": null
}
```

### 출력 필드 정의

| 필드 | 타입 | 필수 | API 대응 필드 | 설명 |
|---|---|---|---|---|
| `inputType` | `"text"` | Y | — | 입력 유형 |
| `date` | `string \| null` | Y | `Expense.date` | `YYYY-MM-DD`. 추출 불가 시 null |
| `amount` | `number \| null` | Y | `Expense.amount` | 원 단위 정수. 추출 불가 시 null |
| `merchant` | `string \| null` | Y | `Expense.merchant` | 사용처. 추출 불가 시 null |
| `description` | `string` | Y | `Expense.description` | 지출 설명. 추출 불가 시 원문 그대로 |
| `categoryId` | `string \| null` | Y | `Expense.categoryId` | 분류된 카테고리 ID. 분류 불가 시 null |
| `categoryName` | `string \| null` | Y | — | 관리자 검토용. 1.2 규칙 참고 |
| `payerName` | `string \| null` | Y | `Expense.payerName` | 결제자. 추출 불가 시 null |
| `evidenceStatus` | `EvidenceStatus` | Y | `Expense.evidenceStatus` | 텍스트 입력은 항상 `"none"` |
| `evidenceFileId` | `string \| null` | Y | `Expense.evidenceFileId` | 텍스트 입력은 항상 null |
| `aiConfidence` | `number` | Y | `Expense.aiConfidence` | 0.0~1.0. 규칙 기반 산정 |
| `needsReview` | `boolean` | Y | — | true 시 백엔드가 `ExpenseStatus = needs_review` 처리 |
| `missingFields` | `string[]` | Y | `Expense.missingFields` | 허용값은 1.5 참고 |
| `reviewReason` | `string \| null` | Y | `Expense.reviewReason` | 검토 사유. 1.4 규칙 참고 |
| `rawInput` | `string` | Y | — | 원문 보존. 디버깅 및 관리자 검토용 |
| `reviewCode` | `string \| null` | N | — | MVP는 항상 null. 추후 고정 코드값 확장용 optional 필드 |

---

### 신뢰도(`aiConfidence`) 계산 규칙

LLM이 직접 점수를 생성하지 않고 규칙 기반으로 계산합니다.

| 조건 | 가산 점수 |
|---|---|
| `date` 추출 성공 | +0.3 |
| `amount` 추출 성공 | +0.4 |
| `categoryId` 분류 성공 | +0.2 |
| `payerName` 추출 성공 | +0.1 |
| **최대 합계** | **1.0** |

---

### `needsReview` 판정 조건

| 조건 | 판정 주체 |
|---|---|
| `aiConfidence < 0.7` | LLM Lambda |
| `evidenceStatus == "none"` | LLM Lambda (무조건) |
| 예산 초과 | 백엔드 |

---

### 테스트 케이스 예시

| 입력 | 기대 결과 요약 |
|---|---|
| `"어제 행사 다과 32,000원"` | date 오늘-1일, amount 32000, category 다과비, needsReview true (텍스트 입력) |
| `"삼겹살 158000 홍길동"` | amount 158000, payerName 홍길동, date null → missingFields에 date 포함 |
| `"5/12 OO마트 영수증"` | date 05-12, merchant OO마트, amount null → needsReview true |
| `"회식비"` | description 회식비, 나머지 전부 null → aiConfidence 0.0 |
| `"2만원"` | amount 20000, 나머지 null → missingFields에 date/merchant/category/payerName/evidence |

---

## 3. 영수증 OCR Lambda

S3에 저장된 영수증 이미지를 Textract로 분석한 뒤 LLM으로 정제합니다.

### 입력 예시

```json
{
  "inputType": "image",
  "s3Key": "receipts/proj_abc123/receipt_001.jpg",
  "projectId": "proj_abc123",
  "evidenceFileId": "evf_xyz789",
  "submittedBy": {
    "userId": "U12345",
    "displayName": "진수연"
  },
  "categories": [
    { "id": "cat_01", "name": "다과비", "keywords": ["간식", "음료", "다과", "케이터링"] }
  ]
}
```

### 입력 필드 정의

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `inputType` | `"image"` | Y | 입력 유형 식별자 |
| `s3Key` | `string` | Y | S3 이미지 경로 (백엔드가 전달) |
| `projectId` | `string` | Y | 프로젝트 ID |
| `evidenceFileId` | `string` | Y | `EvidenceFile.id`. Expense 연결에 사용 |
| `submittedBy.userId` | `string` | Y | Slack 사용자 ID. payerName 기본값 후보 |
| `submittedBy.displayName` | `string` | Y | Slack 표시 이름. payerName 기본값 후보 |
| `categories` | `Category[]` | Y | 카테고리 목록 (텍스트 파싱과 동일 구조) |

---

### 출력 예시 — 정상

```json
{
  "inputType": "image",
  "date": "2026-05-15",
  "merchant": "OO편의점 강남점",
  "amount": 15800,
  "description": "OO편의점 강남점 영수증",
  "categoryId": "cat_01",
  "categoryName": "다과비",
  "payerName": null,
  "evidenceStatus": "ocr_completed",
  "evidenceFileId": "evf_xyz789",
  "items": [
    { "name": "삼각김밥",   "quantity": 2, "unitPrice": 1500, "amount": 3000 },
    { "name": "아메리카노", "quantity": 1, "unitPrice": 4500, "amount": 4500 },
    { "name": "과자류",     "quantity": 3, "unitPrice": 2767, "amount": 8300 }
  ],
  "aiConfidence": 0.9,
  "needsReview": false,
  "missingFields": [],
  "reviewReason": null,
  "ocrRawText": "OO편의점 강남점\n2026-05-15 14:32\n삼각김밥 x2 3,000원\n..."
  "reviewCode": null
}
```

### 출력 예시 — OCR 실패

```json
{
  "inputType": "image",
  "date": null,
  "merchant": null,
  "amount": null,
  "description": "영수증",
  "categoryId": null,
  "categoryName": null,
  "payerName": null,
  "evidenceStatus": "ocr_failed",
  "evidenceFileId": "evf_xyz789",
  "items": [],
  "aiConfidence": 0.0,
  "needsReview": true,
  "missingFields": ["date", "merchant", "amount", "category"],
  "reviewReason": "OCR 분석 실패",
  "ocrRawText": ""
  "reviewCode": null
}
```

### 출력 필드 정의

| 필드 | 타입 | 필수 | API 대응 필드 | 설명 |
|---|---|---|---|---|
| `inputType` | `"image"` | Y | — | 입력 유형 |
| `date` | `string \| null` | Y | `Expense.date` | `YYYY-MM-DD`. Textract 결과 기준 |
| `merchant` | `string \| null` | Y | `Expense.merchant` | 상호명. 추출 불가 시 null |
| `amount` | `number \| null` | Y | `Expense.amount` | 영수증 합계 금액. 추출 불가 시 null |
| `description` | `string` | Y | `Expense.description` | 자동 생성. 아래 규칙 참고 |
| `categoryId` | `string \| null` | Y | `Expense.categoryId` | 분류된 카테고리 ID |
| `categoryName` | `string \| null` | Y | — | 관리자 검토용. 1.2 규칙 참고 |
| `payerName` | `null` | Y | `Expense.payerName` | 영수증에서 추출 불가. 항상 null 고정 (※ TBD) |
| `evidenceStatus` | `EvidenceStatus` | Y | `Expense.evidenceStatus` | 성공: `"ocr_completed"`, 실패: `"ocr_failed"` |
| `evidenceFileId` | `string` | Y | `Expense.evidenceFileId` | 입력값 그대로 반환. Expense 연결용 |
| `items` | `ReceiptItem[]` | Y | — | 품목 목록. 아래 구조 참고 |
| `aiConfidence` | `number` | Y | `Expense.aiConfidence` | 0.0~1.0. 규칙 기반 산정 |
| `needsReview` | `boolean` | Y | — | 판정 조건 참고 |
| `missingFields` | `string[]` | Y | `Expense.missingFields` | 허용값은 1.5 참고 |
| `reviewReason` | `string \| null` | Y | `Expense.reviewReason` | 검토 사유. 1.4 규칙 참고 |
| `ocrRawText` | `string` | Y | — | Textract 원문 보존. 크기 제한 주의 (TBD) |
| ocrRawTextS3Key | string \| null | N | — | ocrRawText 10KB 초과 시 S3 key 전달. 이 경우 ocrRawText = null |
| `reviewCode` | `string \| null` | N | — | MVP는 항상 null. 추후 고정 코드값 확장용 optional 필드 |

> **`payerName` 처리 방침:** 영수증에는 결제자 이름이 포함되지 않으므로 OCR Lambda는 항상 null을 반환합니다.
> `submittedBy.displayName`을 payerName 기본값으로 사용할지 여부는 백엔드와 협의합니다. (TBD)

---

### `description` 자동 생성 규칙

| 조건 | 생성값 |
|---|---|
| `merchant` 추출 성공 | `"{merchant} 영수증"` |
| `merchant == null`, `date` 존재 | `"영수증 {date}"` |
| 둘 다 null | `"영수증"` |

---

### `items[]` (ReceiptItem) 구조

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `name` | `string` | Y | 품목명 |
| `quantity` | `number \| null` | Y | 수량. 추출 불가 시 null |
| `unitPrice` | `number \| null` | Y | 단가. 추출 불가 시 null |
| `amount` | `number` | Y | 해당 품목 금액 합계 |

---

### 신뢰도(`aiConfidence`) 계산 규칙

| 조건 | 가산 점수 |
|---|---|
| `date` 추출 성공 | +0.2 |
| `merchant` 추출 성공 | +0.2 |
| `amount` 추출 성공 | +0.3 |
| `items` 1개 이상 추출 성공 | +0.2 |
| `categoryId` 분류 성공 | +0.1 |
| items 추출 실패 시 aiConfidence 상한 | 0.8 |
| **최대 합계** | **1.0** |

---

### `needsReview` 판정 조건

| 조건 | 판정 주체 |
|---|---|
| `aiConfidence < 0.7` | OCR Lambda |
| `amount == null` | OCR Lambda |
| Textract 호출 자체 실패 | OCR Lambda (무조건) |
| items 금액 합계 ≠ `amount` (오차 5% 초과) | OCR Lambda |
| 예산 초과 | 백엔드 |

---

### EvidenceFile 상태 연동 (백엔드 참고)

Lambda는 `evidenceStatus` 값을 출력에 포함하며, 백엔드가 수신 후 `EvidenceFile.ocrStatus`를 갱신합니다.

| 상황 | `evidenceStatus` 출력값 |
|---|---|
| Textract 호출 성공, 정상 추출 | `"ocr_completed"` |
| Textract 호출 성공, amount/date 모두 추출 실패 | `"ocr_failed"` |
| Textract 호출 성공, OCR 결과 텍스트 거의 없음 | `"ocr_failed"` |
| Textract 호출 실패 | `"ocr_failed"` |


---

## 4. 백엔드 협의 필요 항목 (TBD)

| 항목 | 현재 상태 | 협의 내용 |
|---|---|---|
| `payerName` 기본값 처리 | OCR는 항상 null 반환 | `submittedBy.displayName`을 백엔드에서 기본값으로 쓸지 결정 |
| `reviewReason` 형식 | 자유 텍스트 초안 | 고정 코드값 vs 자유 텍스트 결정 필요 |
| `items[]` DB 저장 여부 | 미정 | 로그 전용인지 실제 저장인지 결정 필요 |
| `ocrRawText` 저장 방식 | 확정 | DynamoDB에 전체 저장.
400KB 제한 근접 시 그때 잘라서 저장 + truncated 플래그 대응.
MVP에서는 별도 크기 제한 없음. |
| 예산 초과 판정 위치 | 백엔드 담당으로 분리 | 판정 후 `needsReview` 갱신 방식 확인 필요 |
| `Expense.amount` null 허용 여부 | 확정 | amount null 시 Expense 미저장.
봇 Lambda 호출하여 재입력 요청 메시지 전송 후 END.
사용자 재입력은 새로운 Webhook 요청으로 처리. |
| `ocrRawText` 저장 방식 | 미정 | 10KB 이하는 ocrRawText에 포함, 초과 시 ocrRawText = null로 두고
ocrRawTextS3Key에 S3 key 전달. 기준값은 백엔드와 최종 협의 필요 |
| 봇 재입력 요청 안내 문구 | 미정 | amount 누락 시 사용자에게 보낼 메시지 문구 봇 담당팀과 협의 필요 |