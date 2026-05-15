# BudgetFlow MVP 전체 정리

## 1. MVP 한 줄 정의

BudgetFlow MVP 1차는 **Slack으로 들어온 지출 설명을 비동기 LLM 처리로 구조화하고, 관리자가 웹 대시보드에서 검토·승인한 뒤, 제출용 엑셀 지출내역서를 내려받는 정산 자동화 흐름**을 검증하는 버전이다. OCR, 엑셀 템플릿 자동 매핑, 상품 링크 분석은 전체 서비스 방향에는 포함되지만 MVP 1차 이후 단계로 분리한다.

초기 프론트엔드는 백엔드 완성 전에도 시연 가능해야 하므로 Mock API로 동작하고, 이후 AWS 서버리스 백엔드로 API/Auth/파일 저장 경계만 교체한다.

## 2. MVP 핵심 사용자와 가치

| 사용자 | MVP에서 하는 일 | 제공 가치 |
| --- | --- | --- |
| 관리자/회계 담당자 | 프로젝트 생성, 카테고리/예산 설정, 지출 검토, 정산 마감, 엑셀 다운로드 | 메신저 자료를 수동 취합하지 않고 검토와 승인에 집중 |
| 일반 팀원 | Slack에 지출 설명과 증빙 자료를 제출 | 별도 엑셀 작성 없이 메신저 입력만 수행 |
| 발표/운영 팀 | Mock 기반 대시보드와 향후 AWS 연동 구조를 설명 | 백엔드 미완성 상태에서도 전체 제품 흐름 시연 가능 |

## 3. MVP 사용자 흐름

```text
관리자 로그인
→ 프로젝트 생성/목록 확인
→ 예산 카테고리와 엑셀 양식 설정
→ Slack 채널에서 지출 입력 수신
→ LLM 분석 결과가 지출 목록에 반영
→ needs_review 항목을 웹에서 수정·승인·반려
→ 정산 마감
→ approved 항목 기준 엑셀 생성
→ S3 Presigned URL 다운로드
```

## 4. 시스템 흐름

### 4.1 즉시 응답 단계

```text
Slack 이벤트 수신
→ Webhook Lambda가 3초 안에 접수 응답
→ 원본 메시지/파일을 S3에 저장
→ Step Functions 비동기 분석 실행
```

### 4.2 비동기 분석 단계

MVP 1차 기준:

```text
지출 설명 텍스트 → LLM 파싱 및 정규화
→ 날짜, 사용처, 금액, 결제자, 카테고리, 증빙 상태 추출
→ confidence, 누락 필드, 예산 초과 여부로 needs_review 판정
→ DynamoDB에 Expense/Evidence 저장
→ Slack에 완료 또는 검토 필요 알림
```

후속 단계 기준:

```text
이미지/PDF 영수증 → Textract OCR
엑셀 템플릿 → 컬럼 구조 분석 및 매핑 추천
상품 링크 → 상품 정보 추출 및 예산안 후보 생성
```

### 4.3 관리자 검토·엑셀 생성 단계

```text
웹 대시보드가 API Gateway를 통해 지출 목록 조회
→ TanStack Query 5초 폴링으로 신규 지출 반영
→ 관리자가 needs_review 항목 수정 후 approved/rejected 처리
→ 정산 마감 후 approved 항목만 export job에 포함
→ Lambda가 엑셀 템플릿에 데이터 삽입
→ S3 저장 후 Presigned URL 반환
```

## 5. 데이터 상태 기준

| 도메인 | 상태값 | 의미 |
| --- | --- | --- |
| Expense | `created` | 입력 접수 직후 |
| Expense | `processing` | 비동기 분석 처리 중 |
| Expense | `needs_review` | 신뢰도 낮음, 누락 필드, 예산 초과, 증빙 문제 등으로 관리자 검토 필요 |
| Expense | `approved` | 관리자 승인 완료, export 포함 가능 |
| Expense | `rejected` | 관리자 반려 |
| Expense | `exported` | 엑셀 생성에 포함 완료 |
| Evidence | `none`, `uploaded`, `ocr_completed`, `ocr_failed`, `verified` | 증빙 파일 및 OCR 처리 상태 |
| Export | `requested`, `generating`, `completed`, `failed`, `expired` | 엑셀 생성 작업 상태 |
| Template | `none`, `suggested`, `confirmed` | 엑셀 양식 업로드/컬럼 매핑 상태 |

> 상태 명칭은 현재 프론트 구현 기준으로 `confirmed` 대신 `approved`를 최종 승인 상태로 사용한다.

## 6. 현재 프론트엔드 구현 현황

| Slice | 범위 | 현재 상태 | 주요 파일 |
| --- | --- | --- | --- |
| 1 | Next.js App Router 스캐폴딩, provider, route group | 완료 | `budgetflow-web/src/app`, `budgetflow-web/src/app/providers.tsx` |
| 2 | 도메인 타입, Mock API, Query hooks | 완료 | `src/lib/domain.ts`, `src/lib/api/budgetflow-api.ts`, `src/lib/hooks/use-budgetflow.ts` |
| 3 | 로그인 화면, Mock Auth, Cognito placeholder | 완료 | `src/app/(auth)/login`, `src/lib/auth/auth-api.ts` |
| 4 | 프로젝트 목록/생성 | 완료 | `src/app/(dashboard)/projects/projects-client.tsx` |
| 5 | 지출 목록, 상태 필터, needs_review 강조, 5초 폴링 | 완료 | `src/app/(dashboard)/expenses/expenses-client.tsx` |
| 6 | needs_review 상세 검토, 수정, 승인/반려 | 완료 | `src/lib/forms/expense-review.ts`, `expenses-client.tsx` |
| 7 | 정산 마감, export job, 다운로드 링크 Mock | 완료 | `src/lib/api/budgetflow-api.ts`, `expenses-client.tsx` |
| 8 | 카테고리/예산 한도/키워드 관리 | 완료 | `src/app/(dashboard)/settings/settings-client.tsx`, `src/lib/forms/budget-category.ts` |
| 9 | 엑셀 양식 업로드, 컬럼 매핑 추천/확정 Mock | 완료 | `settings-client.tsx`, `src/lib/forms/template.ts` |

## 7. 현재 앱에서 시연 가능한 MVP 경로

1. `/login`에서 개발용 Mock 계정으로 로그인한다.
   - 이메일: `admin@budgetflow.dev`
   - 비밀번호: `budgetflow`
2. `/projects`에서 프로젝트 목록을 확인하거나 새 프로젝트를 만든다.
   - 현재 데모 앱은 지출/설정 화면이 고정 Mock 프로젝트(`project-aingthon`)를 사용한다.
   - 실제 프로젝트 선택 반영은 라우트 파라미터 또는 선택 프로젝트 컨텍스트 추가 후 가능하다.
3. `/expenses`에서 고정 Mock 프로젝트의 전체 지출, `needs_review`, `approved`, `rejected` 필터를 확인한다.
4. 지출 행을 선택해 상세 패널에서 날짜, 금액, 카테고리, 설명을 수정한다.
5. 항목을 승인 또는 반려하고 목록/요약 카드 갱신을 확인한다.
6. `정산 마감` 후 `엑셀 생성`을 눌러 needs_review 제외 경고와 Mock 다운로드 링크를 확인한다.
7. `/settings`에서 예산 카테고리, 한도, 키워드, 엑셀 양식 업로드/매핑 확정을 확인한다.

## 8. AWS 전환 시 유지해야 할 경계

| 영역 | 현재 Mock 위치 | AWS 전환 대상 | 유지 원칙 |
| --- | --- | --- | --- |
| 인증 | `src/lib/auth/auth-api.ts` | Cognito + Amplify Auth | 화면은 유지하고 signIn/session 구현만 교체 |
| API 호출 | `src/lib/api/budgetflow-api.ts` | API Gateway + Lambda | React 컴포넌트는 hooks만 호출하게 유지 |
| 서버 상태 | `src/lib/hooks/use-budgetflow.ts` | 동일 | Query key와 invalidate 정책 유지 |
| 파일 업로드 | Template upload Mock | S3 upload/presigned POST | 컴포넌트는 업로드 결과 타입만 의존 |
| 엑셀 다운로드 | Mock URL | S3 Presigned URL | `<a href>` 다운로드 방식 유지 |
| 배포 | 로컬 Next.js | AWS Amplify Hosting | `main` 브랜치 기반 CI/CD로 연결 |
| 데이터 저장 | In-memory mock data | DynamoDB | 현재 domain type을 API 응답 계약 초안으로 사용 |
| 비동기 처리 | Mock status | Step Functions + Textract + LLM | 상태값을 프론트와 백엔드가 공유 |

## 9. 백엔드/API 팀에 전달할 최소 계약

### 9.1 인증/환경 변수

- `NEXT_PUBLIC_AWS_REGION`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_APP_CLIENT_ID`
- `NEXT_PUBLIC_BUDGETFLOW_API_BASE_URL`

### 9.2 필수 API 초안

| Method | Endpoint 초안 | 목적 |
| --- | --- | --- |
| GET | `/projects` | 프로젝트 목록 |
| POST | `/projects` | 프로젝트 생성 |
| POST | `/projects/{projectId}/close` | 정산 마감 |
| GET | `/projects/{projectId}/expenses?status=` | 지출 목록/필터 |
| PATCH | `/expenses/{expenseId}/approve` | 검토 수정 후 승인 |
| PATCH | `/expenses/{expenseId}/reject` | 반려 |
| GET | `/projects/{projectId}/expense-summary` | 요약 카드 |
| GET/POST/PATCH | `/projects/{projectId}/budget-categories` | 카테고리 관리 |
| POST | `/projects/{projectId}/template` | 엑셀 양식 업로드 |
| PATCH | `/projects/{projectId}/template-mapping` | 컬럼 매핑 확정 |
| GET/POST | `/projects/{projectId}/exports` | export job 조회/생성 |

## 10. MVP 완료 기준

### 10.1 프론트엔드 완료 기준

- [x] Mock API만으로 로그인 → 프로젝트 → 지출 검토 → 정산 마감 → 다운로드 흐름이 연결된다.
- [x] 지출 목록은 5초 폴링과 수동 새로고침을 제공한다.
- [x] `needs_review` 항목은 UI에서 강조되고 승인/반려할 수 있다.
- [x] 카테고리 예산 한도와 사용률을 확인할 수 있다.
- [x] 엑셀 양식 업로드/컬럼 매핑 확정의 Mock 진입점이 있다.
- [x] 실제 AWS 연동 교체 지점이 `src/lib/api`, `src/lib/auth`, 환경 변수로 제한된다.

### 10.2 아직 실제 서비스로 전환하기 전 남은 일

- [ ] Cognito User Pool/App Client 생성 및 Amplify Auth 연동
- [ ] 로그인 후 라우트 보호, 세션 만료 처리, 역할별 접근 제어 추가
- [ ] API Gateway/Lambda/DynamoDB 실제 endpoint 연결
- [ ] 현재 데모용 고정 프로젝트 ID(`project-aingthon`)를 라우트 파라미터 또는 선택 프로젝트 컨텍스트로 교체
- [ ] Slack bot event schema와 Expense 응답 구조 확정
- [ ] S3 파일 업로드/다운로드 presigned URL 연동
- [ ] Textract/LLM confidence, missing fields, needs_review 규칙 확정
- [ ] 엑셀 템플릿 컬럼 매핑을 실제 Lambda export 로직과 연결
- [ ] Amplify Hosting에 GitHub `main` 브랜치 연결

## 11. 다음 개발 단계 제안

1. **현재 프론트 MVP 커밋 정리**
   - `.env.example`이 git에 포함되는지 확인한다. 현재 `budgetflow-web/.gitignore`에는 `!.env.example` 예외가 추가되어 있다.
   - `budgetflow-web` 전체, `.gitignore`, MVP 정리 문서를 하나의 Lore commit으로 묶는다.
2. **AWS 연동 준비 브랜치**
   - `src/lib/api`에 `NEXT_PUBLIC_BUDGETFLOW_API_BASE_URL` 기반 fetch client를 추가하되 Mock fallback을 유지한다.
   - `src/lib/auth`에 Cognito 설정값 존재 여부에 따른 실제/Mock 분기 구조를 둔다.
3. **팀 계약 확정**
   - 백엔드와 API path/response type을 현재 `src/lib/domain.ts` 기준으로 맞춘다.
   - LLM/OCR 팀과 `aiConfidence`, `missingFields`, `reviewReason` 산출 규칙을 확정한다.
4. **배포/시연 안정화**
   - Amplify Hosting 연결 전까지 로컬 build, lint, test를 기준 검증 명령으로 유지한다.
   - 발표 시나리오는 `/login → /projects → /expenses → /settings` 순서로 고정한다.
