# BudgetFlow API 질문 정리 — 처음 보는 사람용 설명

이 문서는 `BudgetFlow_API_명세서.md`와 `BudgetFlow_백엔드_API_계약.md`를 보고 나온 질문을, API를 처음 접하는 사람도 이해할 수 있게 풀어서 정리한 문서입니다.

정리 대상 질문은 3가지입니다.

1. Cognito JWT Bearer 인증은 실제로 어디서 하는가?
2. 지출 승인 시 `merchant`, `payerName`도 수정할 수 있는가?
3. Export API 성공 코드가 언제 `200`이고 언제 `202`인가?

---

## 1. 인증 관련 — Cognito JWT Bearer 인증이란?

### 1.1 한 줄 요약

사용자가 로그인하면 Cognito가 “이 사용자는 인증된 사용자입니다”라는 증명서 역할의 토큰을 발급하고, 프론트엔드는 API를 호출할 때 그 토큰을 함께 보냅니다.

백엔드는 그 토큰을 확인해서 다음을 판단합니다.

- 이 사용자가 진짜 로그인한 사용자인가?
- 이 사용자가 어느 조직에 속해 있는가?
- 이 사용자가 이 프로젝트나 지출 데이터를 볼 권한이 있는가?

---

### 1.2 JWT Bearer 인증이 뭔가요?

API 요청을 보낼 때 HTTP header에 아래처럼 토큰을 붙여 보내는 방식입니다.

```http
Authorization: Bearer <Cognito JWT>
```

여기서 각 단어의 의미는 다음과 같습니다.

| 용어 | 의미 |
| --- | --- |
| `Authorization` | 인증 정보를 담는 HTTP header 이름 |
| `Bearer` | “이 토큰을 가진 사람이 인증된 사용자다”라는 방식 |
| `Cognito JWT` | AWS Cognito가 발급한 로그인 증명 토큰 |

즉 프론트엔드는 API를 호출할 때마다 대략 이런 식으로 요청합니다.

```http
GET /projects
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

### 1.3 실제 인증은 어디서 하나요?

현재 명세에는 다음처럼만 적혀 있습니다.

```txt
Cognito JWT Bearer 인증 권장
Authorization: Bearer <Cognito JWT>
```

하지만 “정확히 어디에서 토큰을 검증한다”는 내용은 아직 확정되어 있지 않습니다.

가능한 방식은 보통 2가지입니다.

### 방식 A. API Gateway에서 인증

프론트엔드가 API Gateway로 요청을 보냅니다.

```txt
프론트엔드 → API Gateway → 백엔드
```

API Gateway가 먼저 Cognito JWT를 확인합니다.

- 토큰이 없으면 거절
- 토큰이 잘못됐으면 거절
- 토큰이 정상일 때만 백엔드로 전달

이 방식은 백엔드에 도달하기 전에 인증을 막을 수 있어서 안전하고 흔한 방식입니다.

### 방식 B. 백엔드 서버에서 인증

프론트엔드 요청이 백엔드까지 도착한 뒤, 백엔드 코드에서 JWT를 직접 검증합니다.

```txt
프론트엔드 → 백엔드 → JWT 검증
```

이 경우 백엔드 middleware 같은 곳에서 토큰을 확인합니다.

---

### 1.4 이 프로젝트에서는 무엇을 확정해야 하나요?

현재 문서만 보면 인증 방식은 “권장”까지만 되어 있고, 아래 내용은 확정이 필요합니다.

| 확정 필요 항목 | 설명 |
| --- | --- |
| JWT 검증 위치 | API Gateway에서 할지, 백엔드에서 할지 |
| 사용할 토큰 | Cognito ID token을 쓸지, Access token을 쓸지 |
| 사용자 ID claim key | JWT 안에서 사용자 ID를 어떤 key로 읽을지 |
| 조직 ID claim key | JWT 안에서 조직 ID를 어떤 key로 읽을지 |

---

### 1.5 userId, organizationId는 JWT 안에 들어있어야 하나요?

권장 답변은 다음과 같습니다.

- `userId`는 Cognito 기본 claim인 `sub`를 사용
- `organizationId`는 Cognito custom attribute인 `custom:organizationId`를 사용

예시는 아래와 같습니다.

```json
{
  "sub": "user-123",
  "email": "admin@budgetflow.dev",
  "custom:organizationId": "org-gdgoc"
}
```

이때 백엔드는 이렇게 해석합니다.

| JWT claim | 백엔드에서 쓰는 값 |
| --- | --- |
| `sub` | `userId` |
| `custom:organizationId` | `organizationId` |
| `email` | 사용자 이메일 |

---

### 1.6 왜 organizationId를 JWT에서 읽어야 하나요?

조직 ID는 보안상 중요합니다.

예를 들어 사용자가 API 요청 body에 직접 `organizationId`를 보낸다고 가정해보겠습니다.

```json
{
  "organizationId": "org-other"
}
```

악의적인 사용자가 이 값을 다른 조직 ID로 바꾸면, 다른 조직 데이터를 요청할 위험이 생깁니다.

따라서 백엔드는 사용자가 보낸 `organizationId`를 그대로 믿으면 안 됩니다.

더 안전한 방식은 다음과 같습니다.

```txt
organizationId는 요청 body가 아니라 JWT에서 읽는다.
```

즉 백엔드는 토큰 안의 `custom:organizationId`를 보고, 그 조직의 데이터만 조회하거나 수정하게 해야 합니다.

---

### 1.7 인증 관련 권장 명세 문구

API 명세에는 아래처럼 명확히 적는 것을 권장합니다.

```md
## 인증

모든 운영 API는 Cognito JWT Bearer 인증을 사용한다.
프론트엔드는 API 요청 시 다음 header를 포함해야 한다.

Authorization: Bearer <Cognito ID token>

백엔드는 JWT를 검증한 뒤 다음 claim을 사용한다.

- userId: `sub`
- organizationId: `custom:organizationId`
- email: `email`

요청 body나 query parameter로 전달된 organizationId는 권한 판단의 기준으로 사용하지 않는다.
조직 범위 제한은 JWT의 `custom:organizationId`를 기준으로 처리한다.
```

---

## 2. 지출 승인 수정 필드 관련

### 2.1 현재 API 명세는 어떻게 되어 있나요?

현재 `PATCH /expenses/{expenseId}/approve` API는 지출을 수정한 뒤 승인하는 API입니다.

현재 명세상 요청 body는 아래 4개 필드만 받습니다.

```json
{
  "date": "2026-05-12",
  "amount": 186000,
  "categoryId": "cat-food",
  "description": "운영진 저녁 식사 도시락"
}
```

즉 현재 문서 기준으로 수정 가능한 값은 다음뿐입니다.

| 필드 | 의미 | 현재 수정 가능 여부 |
| --- | --- | --- |
| `date` | 사용일 | 가능 |
| `amount` | 금액 | 가능 |
| `categoryId` | 예산 카테고리 | 가능 |
| `description` | 지출 설명 | 가능 |
| `merchant` | 결제처 / 사용처 | 명세상 불가 |
| `payerName` | 결제자 | 명세상 불가 |

---

### 2.2 merchant, payerName은 뭔가요?

| 필드 | 쉬운 설명 | 예시 |
| --- | --- | --- |
| `merchant` | 어디에서 결제했는지 | 인하분식, 편의점, 카페인하 |
| `payerName` | 누가 결제했는지 | 홍길동, 김민지, 백승엽 |

예를 들어 아래 지출이 있다고 가정합니다.

```json
{
  "date": "2026-05-12",
  "amount": 186000,
  "merchant": "인하분식",
  "payerName": "백승엽",
  "description": "운영진 저녁 식사 도시락"
}
```

관리자가 확인하다 보면 이런 상황이 생길 수 있습니다.

- OCR이나 Slack 메시지 분석이 결제처를 잘못 읽음
- 결제자가 잘못 매칭됨
- 영수증에는 결제처가 다르게 찍혀 있음
- 사용자가 입력한 결제자 이름에 오타가 있음

이 경우 관리자가 `merchant`, `payerName`도 수정할 수 있어야 운영상 자연스럽습니다.

---

### 2.3 현재 구현은 어떻게 되어 있나요?

현재 프론트엔드 코드도 명세와 동일하게 4개만 수정합니다.

수정 가능:

- `date`
- `amount`
- `categoryId`
- `description`

수정 불가:

- `merchant`
- `payerName`

따라서 현재 기준으로는 `merchant`, `payerName`은 “보여주기만 하고 수정하지 않는 값”입니다.

---

### 2.4 권장 방향

실제 관리자 검토 화면에서는 `merchant`, `payerName`도 수정 가능하게 하는 것을 권장합니다.

권장 요청 body는 아래와 같습니다.

```json
{
  "date": "2026-05-12",
  "amount": 186000,
  "categoryId": "cat-food",
  "merchant": "인하분식",
  "payerName": "백승엽",
  "description": "운영진 저녁 식사 도시락"
}
```

---

### 2.5 수정된 명세 예시

```md
## PATCH /expenses/{expenseId}/approve

지출 정보를 수정한 뒤 승인한다.

### Request body

| field | type | required | 설명 |
| --- | --- | --- | --- |
| `date` | string | Y | 사용일, `YYYY-MM-DD` |
| `amount` | number | Y | 지출 금액, 1 이상 정수 |
| `categoryId` | string | Y | 예산 카테고리 ID |
| `merchant` | string | Y | 결제처 / 사용처 |
| `payerName` | string | Y | 결제자 이름 |
| `description` | string | Y | 지출 설명 |

### 처리 규칙

- 요청된 필드로 지출 정보를 갱신한다.
- `status`를 `approved`로 변경한다.
- `reviewReason`은 `null`로 초기화한다.
- `updatedAt`을 현재 시각으로 갱신한다.
```

---

## 3. Export API의 200과 202 차이

### 3.1 Export API는 무엇을 하나요?

Export API는 승인된 지출 목록을 엑셀 파일로 만들어주는 API입니다.

API 경로는 아래와 같습니다.

```http
POST /projects/{projectId}/exports/expense-report
```

쉽게 말하면 관리자가 화면에서 “지출내역서 다운로드” 버튼을 누를 때 호출되는 API입니다.

---

### 3.2 왜 성공 코드가 200 또는 202 두 개인가요?

엑셀 파일 생성은 상황에 따라 빠를 수도 있고 오래 걸릴 수도 있습니다.

예를 들어 지출이 5개뿐이면 바로 만들 수 있습니다.

```txt
요청 → 엑셀 생성 완료 → 다운로드 URL 반환
```

이 경우는 `200 OK`가 적절합니다.

반대로 지출이 많거나 파일 생성에 시간이 걸리면 바로 파일을 줄 수 없습니다.

```txt
요청 → 생성 작업 등록 → 나중에 완료됨
```

이 경우는 `202 Accepted`가 적절합니다.

---

### 3.3 200 OK는 언제 쓰나요?

`200 OK`는 요청을 처리했고, 엑셀 파일 생성까지 완료된 경우입니다.

즉 응답에 바로 다운로드 URL이 포함됩니다.

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

이때 프론트엔드는 바로 사용자에게 다운로드 버튼이나 링크를 보여주면 됩니다.

정리하면:

```txt
200 = 엑셀 생성 완료 + downloadUrl 있음
```

---

### 3.4 202 Accepted는 언제 쓰나요?

`202 Accepted`는 요청은 정상적으로 받았지만, 엑셀 파일 생성이 아직 끝나지 않은 경우입니다.

예시 응답은 아래와 같습니다.

```json
{
  "id": "export-new",
  "projectId": "project-aingthon",
  "type": "expense_report",
  "status": "generating",
  "includedExpenseCount": 4,
  "excludedReviewCount": 2,
  "downloadUrl": null,
  "expiresAt": null,
  "createdAt": "2026-05-15T06:30:00Z"
}
```

이때는 아직 파일이 없기 때문에 다운로드 URL도 없습니다.

프론트엔드는 일정 시간마다 Export 목록 API를 다시 호출해서 완료 여부를 확인해야 합니다.

```http
GET /projects/{projectId}/exports
```

이 방식을 polling이라고 부릅니다.

정리하면:

```txt
202 = 생성 요청만 접수됨 + 아직 downloadUrl 없음 + polling 필요
```

---

### 3.5 프론트엔드 입장에서의 처리 흐름

### 200인 경우

```txt
1. 사용자가 “엑셀 생성” 클릭
2. POST /exports/expense-report 호출
3. 서버가 200 응답
4. 응답 status가 completed
5. downloadUrl이 있음
6. 바로 다운로드 버튼 표시
```

### 202인 경우

```txt
1. 사용자가 “엑셀 생성” 클릭
2. POST /exports/expense-report 호출
3. 서버가 202 응답
4. 응답 status가 requested 또는 generating
5. downloadUrl이 아직 없음
6. 프론트가 GET /exports를 주기적으로 호출
7. status가 completed가 되면 downloadUrl 표시
```

---

### 3.6 권장 명세 문구

```md
## POST /projects/{projectId}/exports/expense-report

지출내역서 엑셀 생성을 요청한다.

### 성공 응답

- `200 OK`: 엑셀 생성이 즉시 완료된 경우
  - `status = completed`
  - `downloadUrl` 포함

- `202 Accepted`: 엑셀 생성 작업이 비동기로 등록된 경우
  - `status = requested` 또는 `generating`
  - `downloadUrl`은 아직 없을 수 있음
  - 프론트엔드는 `GET /projects/{projectId}/exports`를 polling하여 완료 여부를 확인한다.
```

---

## 4. 최종 정리

### 질문 1. 인증은 어디서 하나요?

현재 문서에는 명확히 확정되어 있지 않습니다.

확정해야 할 내용은 다음입니다.

```txt
JWT 검증 위치: API Gateway 또는 백엔드 middleware
userId claim: sub 권장
organizationId claim: custom:organizationId 권장
```

권장 방향은 JWT 안의 claim을 기준으로 사용자와 조직을 판단하는 것입니다.

---

### 질문 2. merchant, payerName은 수정 불가인가요?

현재 명세와 구현 기준으로는 수정 불가입니다.

현재 수정 가능한 필드는 다음 4개입니다.

```txt
date, amount, categoryId, description
```

하지만 실제 관리자 검토 흐름에서는 결제처와 결제자도 잘못 인식될 수 있으므로 아래처럼 확장하는 것을 권장합니다.

```txt
date, amount, categoryId, merchant, payerName, description
```

---

### 질문 3. Export API는 언제 200이고 언제 202인가요?

```txt
200 OK
= 엑셀 생성이 바로 끝남
= downloadUrl을 바로 받을 수 있음

202 Accepted
= 엑셀 생성 요청만 접수됨
= 아직 파일 생성 중
= GET /exports로 완료될 때까지 polling 필요
```

---

## 5. 백엔드에 전달할 확인 질문

아래 질문을 백엔드 담당자에게 그대로 전달하면 됩니다.

1. Cognito JWT 검증은 API Gateway에서 하나요, 백엔드 middleware에서 하나요?
2. 프론트엔드는 Cognito ID token과 Access token 중 무엇을 보내야 하나요?
3. 사용자 ID는 JWT의 `sub` claim을 사용하면 되나요?
4. 조직 ID는 JWT의 `custom:organizationId` claim을 사용하면 되나요?
5. `PATCH /expenses/{expenseId}/approve`에서 `merchant`, `payerName`도 수정 가능하게 열어도 되나요?
6. `POST /projects/{projectId}/exports/expense-report`는 즉시 생성이면 `200`, 비동기 생성이면 `202`로 확정해도 되나요?
