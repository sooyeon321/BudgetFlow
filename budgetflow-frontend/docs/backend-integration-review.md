# BudgetFlow Backend Integration Review

작성일: 2026-05-25

분석 대상:

- Backend repository: https://github.com/sungahbak/cloudcomputing.git
- 기준 브랜치: `develop`
- 기준 커밋: `15acdbbaba2675ca94dbc66669db371fe0d6eb1b`
- 참고 브랜치: `master`
- 참고 커밋: `1ec6e7559833d15381c5f6a3c02a04c94d60466d`

## 요약

백엔드 저장소는 Express + TypeScript + PostgreSQL 기반의 API 골격을 갖추고 있다. 현재 서비스에 바로 활용할 수 있는 부분은 API 라우트 구조, Swagger 문서, PostgreSQL 도메인 스키마, AWS CDK 인프라 초안이다.

다만 실제 프론트엔드 화면에 안정적으로 연결하려면 API 응답 필드, 상태값, 인증 방식, CORS, 일부 라우트 버그를 먼저 맞춰야 한다. 현재 백엔드는 기능 완성본이라기보다 1차 협업용 인터페이스와 mock/stub 구현에 가깝다.

## 바로 반영 가능한 항목

### 1. API 호출 구조 전환

프론트엔드의 `src/lib/api/budgetflow-api.ts`는 현재 mock 데이터 기반이다. 백엔드 라우트가 이미 다음 주요 도메인별로 나뉘어 있으므로 API 클라이언트를 실제 HTTP 호출 방식으로 전환할 수 있다.

- Auth: `/api/auth`
- Projects: `/api/projects`
- Expenses: `/api/expenses`
- Budget categories: `/api/budget-categories`
- Templates: `/api/projects/:projectId/template`
- Exports: `/api/projects/:projectId/exports`

권장 프론트엔드 환경변수:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

주의: 백엔드의 기본 포트는 `3000`이다. Next.js 개발 서버도 보통 `3000`을 사용하므로 로컬 개발에서는 백엔드를 `3001` 또는 `8080`으로 실행하는 편이 안전하다.

### 2. 데모 로그인 연동

백엔드에는 `POST /api/auth/login`이 있다.

현재 동작:

- `email`이 `admin@inha.ac.kr`이면 로그인 성공
- `idToken`, `accessToken`, `message` 반환
- 비밀번호 검증은 아직 없음
- JWT는 로컬 `JWT_SECRET` 기반

프론트엔드의 `src/lib/auth/auth-api.ts`에 백엔드 로그인 모드를 추가하면 임시 실연용 인증 흐름을 만들 수 있다.

운영 또는 AWS 전환 기준으로는 이 방식을 그대로 쓰면 안 된다. Cognito 로그인을 사용하고, 백엔드는 Cognito JWT를 검증하도록 바꾸는 것이 맞다.

### 3. PostgreSQL 도메인 스키마 활용

`src/init.sql`은 현재 BudgetFlow 화면 구조와 잘 맞는다. 다음 테이블이 정의되어 있다.

- `projects`
- `budget_categories`
- `expenses`
- `export_jobs`
- `evidence_files`

특히 프론트엔드의 프로젝트, 예산 카테고리, 지출 검토, 증빙 상태, 내보내기 작업과 연결할 수 있는 필드가 이미 포함되어 있다.

이 스키마는 백엔드와 프론트엔드의 공통 도메인 계약 기준으로 삼을 수 있다.

### 4. Swagger 문서 활용

백엔드는 `swagger.yaml`과 `/api-docs` 구성을 포함한다. 프론트엔드 담당자는 이 문서를 API 계약 확인용으로 사용할 수 있다.

단, 현재 Swagger, 실제 라우터 구현, 프론트엔드 타입 사이에 불일치가 있으므로 Swagger를 최종 계약으로 보기 전에 백엔드 담당자와 정리가 필요하다.

### 5. AWS 인프라 초안 참고

현재 `develop` 브랜치에는 CDK 인프라가 없지만, `master` 브랜치에는 이전 구조의 CDK 초안이 남아 있다.

포함된 AWS 서비스:

- S3
- RDS PostgreSQL 15
- EC2
- Security Group
- VPC lookup

이 코드는 AWS 전환 방향을 잡는 참고 자료로 활용할 수 있다. 다만 보안 설정은 그대로 사용하면 안 된다.

## 조건부 반영 가능 항목

| 영역 | 백엔드 상태 | 프론트엔드 반영 가능성 |
| --- | --- | --- |
| 로그인 | `POST /api/auth/login` 있음 | 데모용으로 가능 |
| 프로젝트 목록 | `GET /api/projects` 있음 | 필드 보완 필요 |
| 프로젝트 상세 | `GET /api/projects/:projectId` 있음 | Slack/template 필드 보완 필요 |
| 프로젝트 생성 | `POST /api/projects` 있음 | request body 계약 조정 필요 |
| 프로젝트 마감 | Swagger에는 있으나 실제 라우트 버그 있음 | 백엔드 수정 후 가능 |
| 지출 목록 | `GET /api/expenses` 있음 | 상태값/필드 불일치 수정 필요 |
| 지출 요약 | `GET /api/expenses/summary` 있음 | 응답 필드 확장 필요 |
| 지출 승인 | `PATCH /api/expenses/:expenseId/approve` 있음 | `confirmed` 상태값 수정 필요 |
| 지출 반려 | `PATCH /api/expenses/:expenseId/reject` 있음 | `reason`/`rejectReason` 계약 조정 필요 |
| 예산 카테고리 | 기본 CRUD 있음 | `budgetAmount`/`budgetLimit` 정렬 필요 |
| 템플릿 업로드 | API 있음 | 실제 파일 처리와 응답 형식 보완 필요 |
| 엑셀 내보내기 | export API 있음 | `ExportJob` 타입에 맞게 보완 필요 |

## 주요 불일치와 수정 필요 사항

### 1. 지출 상태값 불일치

프론트엔드 타입은 `approved` 상태를 사용한다. 백엔드는 일부 응답에서 `confirmed`를 사용한다.

영향:

- 승인 배지 표시 오류
- 필터링 오류
- 요약 카운트 불일치
- 승인 후 UI 갱신 실패 가능성

권장 수정:

- 백엔드 상태값을 `approved`로 통일
- `confirmedCount` 대신 `approvedCount` 사용

### 2. 프로젝트 마감 라우트 버그

Swagger 기준:

```http
POST /api/projects/{projectId}/close
```

현재 백엔드 코드:

```http
POST /api/projects/:projectId
```

권장 수정:

```http
POST /api/projects/:projectId/close
```

### 3. CORS 미들웨어 없음

프론트엔드와 백엔드가 서로 다른 포트 또는 도메인에서 실행되면 브라우저 요청이 CORS에 의해 차단될 수 있다.

권장 수정:

- 백엔드에 `cors` 패키지 추가
- 개발 환경에서는 `http://localhost:3000` 허용
- 배포 환경에서는 실제 프론트엔드 도메인만 허용

### 4. 인증 방식 불일치

프론트엔드는 AWS Cognito 환경변수를 고려하고 있다.

현재 프론트엔드 환경변수:

- `NEXT_PUBLIC_AWS_REGION`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_APP_CLIENT_ID`

백엔드는 로컬 `JWT_SECRET` 기반 데모 JWT를 사용한다.

권장 방향:

- 단기: 백엔드 데모 로그인 API를 프론트에 붙여 시연 가능 상태 확보
- 장기: Cognito Hosted UI 또는 Cognito User Pool 로그인 사용
- 백엔드: Cognito JWT 검증 미들웨어로 전환

### 5. API 응답 필드 부족

프론트엔드의 `src/lib/domain.ts`는 화면 표시를 위해 더 풍부한 필드를 기대한다.

예시:

- Project: `totalBudget`, `usedBudget`, `remainingBudget`, `slackChannelName`, `templateMappingStatus`
- Expense: `evidenceStatus`, `aiConfidence`, `missingFields`, `reviewReason`
- BudgetCategory: `budgetLimit`, `approvedAmount`, `remainingAmount`, `usageRate`
- ExportJob: `includedExpenseCount`, `excludedReviewCount`, `expiresAt`, `createdAt`

백엔드는 현재 최소 필드 mock 응답이 많다. 프론트에서 임시 adapter로 보정할 수는 있지만, 장기적으로는 백엔드 응답 계약을 프론트 타입에 맞추는 것이 낫다.

## API별 세부 반영 검토

### Auth

현재 백엔드:

```http
POST /api/auth/login
```

반영 가능:

- 프론트 로그인 화면에서 실제 API 호출 가능
- 성공 시 `accessToken` 또는 `idToken` 저장
- 이후 API 요청에 `Authorization: Bearer <token>` 추가

주의:

- 현재 비밀번호 검증 없음
- 운영용 인증으로 부적합
- Cognito 전환 필요

### Projects

현재 백엔드:

```http
GET /api/projects
POST /api/projects
GET /api/projects/:projectId
POST /api/projects/:projectId
```

반영 가능:

- 프로젝트 목록 화면
- 프로젝트 상세 화면
- 프로젝트 생성 흐름

필요 수정:

- close 라우트는 `/close`로 수정
- 응답에 예산, Slack, template 관련 필드 추가
- `budgetCategoryIds`만 받는 생성 API를 프론트의 프로젝트 생성 form과 맞추기

### Expenses

현재 백엔드:

```http
GET /api/expenses
GET /api/expenses/summary
PATCH /api/expenses/:expenseId/approve
PATCH /api/expenses/:expenseId/reject
```

반영 가능:

- 지출 목록
- 지출 요약 카드
- 승인/반려 액션

필요 수정:

- `confirmed`를 `approved`로 변경
- summary 응답에 `approvedCount`, `rejectedCount`, `missingEvidenceCount`, `approvedAmount` 추가
- reject 요청/응답의 `reason`, `reviewReason` 계약 통일
- 프로젝트별 필터링 계약 명확화

### Budget Categories

현재 백엔드:

```http
GET /api/budget-categories
POST /api/budget-categories
PATCH /api/budget-categories/:categoryId
```

반영 가능:

- 예산 카테고리 목록
- 카테고리 생성
- 카테고리 예산 수정

필요 수정:

- `budgetAmount` 대신 `budgetLimit` 사용
- `projectId`, `keywords`, `approvedAmount`, `remainingAmount`, `usageRate`, `createdAt` 포함

### Templates

현재 백엔드:

```http
POST /api/projects/:projectId/template
PATCH /api/projects/:projectId/template-mapping
```

반영 가능:

- 템플릿 업로드 UI와 연결 가능
- 감지된 헤더 목록 표시 가능

필요 수정:

- 실제 multipart 파일 업로드 처리
- S3 업로드 또는 presigned URL 방식 결정
- 프론트의 `TemplateUploadResult` 타입과 응답 형식 통일

### Exports

현재 백엔드:

```http
POST /api/projects/:projectId/exports/expense-report
GET /api/projects/:projectId/exports
```

반영 가능:

- 내보내기 요청 버튼
- export job 목록 표시

필요 수정:

- `jobId` 대신 `id` 사용 또는 프론트 adapter 추가
- `includedExpenseCount`, `excludedReviewCount`, `expiresAt`, `createdAt` 포함
- 다운로드 URL 만료 정책 명확화

## AWS 전환 관점에서 반영 가능한 것

### 참고 가능한 구조

`master` 브랜치의 CDK 초안은 다음 방향을 제시한다.

- API 서버: EC2
- DB: RDS PostgreSQL
- 파일 저장소: S3
- 네트워크: VPC + Security Group

### 그대로 쓰면 안 되는 부분

다음 설정은 보안상 수정해야 한다.

- RDS `publiclyAccessible: true`
- SSH 22번 포트 전체 공개
- API 3000번 포트 전체 공개
- DB 비밀번호 하드코딩
- `RemovalPolicy.DESTROY`
- `autoDeleteObjects: true`

### 권장 AWS 구조

수업/데모 기준 최소 구조:

- Frontend: S3 + CloudFront 또는 Amplify Hosting
- Backend: EC2 또는 ECS Fargate
- Database: RDS PostgreSQL
- File storage: S3
- Auth: Cognito
- Secret management: AWS Secrets Manager 또는 SSM Parameter Store

운영에 가까운 구조:

- Frontend: CloudFront + S3
- Backend: ECS Fargate + ALB
- Database: Private RDS
- Auth: Cognito
- File upload: S3 presigned URL
- Logs: CloudWatch Logs
- Secrets: Secrets Manager

## 프론트엔드 담당 작업 목록

### 단기 작업

1. `NEXT_PUBLIC_API_BASE_URL` 추가
2. 공통 fetch client 생성
3. `Authorization: Bearer <token>` 자동 첨부
4. 백엔드 로그인 API 임시 연동
5. 프로젝트 목록/상세 API부터 실제 호출로 전환
6. 백엔드 응답 부족 필드에 대한 임시 adapter 작성

### 중기 작업

1. 지출 목록/승인/반려 API 연동
2. 예산 카테고리 API 연동
3. 지출 요약 API 연동
4. 템플릿 업로드 API 연동
5. export job API 연동

### AWS 전환 시 작업

1. API base URL을 배포 환경변수로 분리
2. Cognito 로그인 플로우 확정
3. 토큰 저장/갱신 정책 정리
4. S3 업로드 방식에 맞춰 템플릿 업로드 UI 수정
5. CloudFront 또는 Amplify 배포 환경 구성

## 백엔드 담당자에게 요청할 사항

우선순위 높은 요청:

1. 백엔드 기본 포트를 `3001` 또는 `8080`으로 변경
2. CORS 설정 추가
3. `POST /api/projects/:projectId/close` 라우트 수정
4. 지출 상태값 `confirmed`를 `approved`로 통일
5. Swagger, 실제 라우터, 프론트엔드 타입 계약 통일
6. 프로젝트별 expenses/categories 필터링 계약 명확화
7. Cognito JWT 검증 방식 도입

API 응답 보완 요청:

1. Project 응답에 예산, Slack, template 상태 필드 포함
2. Expense 응답에 증빙, AI confidence, missing fields, review reason 포함
3. BudgetCategory 응답에 사용액, 잔여액, 사용률 포함
4. ExpenseSummary 응답을 프론트 타입과 일치
5. ExportJob 응답을 프론트 타입과 일치

AWS/파일 처리 요청:

1. S3 presigned upload URL API 추가
2. 템플릿 파일 업로드 실제 처리 구현
3. 증빙 파일 업로드/조회 API 추가
4. export 파일 생성 후 S3 다운로드 URL 반환
5. DB 비밀번호와 JWT secret을 Secrets Manager 또는 SSM으로 이동

## 추천 반영 순서

1. 백엔드 담당자가 CORS, 포트, close 라우트, 상태값을 먼저 수정한다.
2. 프론트엔드는 API client와 env 기반 base URL을 추가한다.
3. 로그인과 프로젝트 목록을 먼저 실제 API로 붙인다.
4. 지출 목록, 요약, 승인/반려를 붙인다.
5. 예산 카테고리와 템플릿 업로드를 붙인다.
6. export job과 다운로드를 붙인다.
7. Cognito, S3, RDS, 배포 URL을 기준으로 AWS 환경 연동을 마무리한다.

## 결론

현재 백엔드 저장소에서 즉시 활용할 수 있는 것은 API 라우트 구조, Swagger 문서, PostgreSQL 스키마, AWS CDK 초안이다. 그러나 화면을 실제 API와 안정적으로 연결하려면 백엔드 응답 계약 정리와 인증/CORS/상태값 수정이 선행되어야 한다.

프론트엔드는 지금 바로 API client를 준비하고 프로젝트/로그인부터 점진적으로 실제 API로 전환할 수 있다. 단, 지출 승인, 요약, 템플릿, export는 백엔드 계약 수정 후 붙이는 것이 안전하다.
