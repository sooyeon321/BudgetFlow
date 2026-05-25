# BudgetFlow 프론트엔드 작업분해

## 1. 전체 흐름 이해

프론트엔드는 BudgetFlow의 관리자용 웹 대시보드이다. 핵심 흐름은 다음과 같다.

```text
관리자 로그인
→ 조직/프로젝트 선택 또는 생성
→ 슬랙 채널 및 예산 카테고리 설정
→ 슬랙에서 들어온 지출 항목 확인
→ needs_review 항목 수정/승인/반려
→ 정산 마감
→ confirmed 항목 기준 엑셀 다운로드
```

MVP 1차에서는 백엔드 API가 완성되기 전에도 Mock API로 UI를 완성한다. 이후 `lib/api/*` 함수 내부만 실제 API 호출로 교체한다.

## 2. 개발 원칙

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui를 기본 스택으로 사용한다.
- 서버 상태는 TanStack Query로 관리하고 지출 목록은 5초 폴링한다.
- 입력 폼은 React Hook Form + Zod로 검증한다.
- 백엔드 연동 전까지 `lib/api`는 Mock 데이터를 반환하되, 실제 API 응답 형태를 미리 가정한 타입으로 작성한다.
- 상태값은 문서의 확정 상태를 기준으로 한다.
  - 지출: `created`, `processing`, `needs_review`, `approved`, `rejected`, `exported`
  - 증빙: `none`, `uploaded`, `ocr_completed`, `ocr_failed`, `verified`
  - Export: `requested`, `generating`, `completed`, `failed`, `expired`

## 3. Skill 기반 진행 방식

### 3.1 작업 분해: `to-issues`

문서의 기능을 얇은 vertical slice 단위로 나눈다. 현재 repo에는 GitHub remote, `AGENTS.md`, `docs/agents` 설정이 없으므로 실제 issue 발행 전에는 issue tracker 설정이 필요하다.

### 3.2 기능 구현: `tdd`

각 slice는 가능한 한 테스트 기준을 먼저 세운 뒤 구현한다.

적용 대상:

- 타입/상태 전이 유틸
- Mock API
- 폼 validation schema
- 필터링/집계 로직

### 3.3 버그 대응: `diagnose`

개발 중 화면이 깨지거나 상태 갱신, 폼 제출, 다운로드 흐름이 예상과 다르면 재현 → 최소화 → 계측 → 수정 → 회귀 테스트 순서로 처리한다.

### 3.4 단일 파일 리뷰: `quick-ts-review`

핵심 TypeScript 파일 단위로 안정성, 가독성, 테스트 관점 리뷰가 필요할 때 사용한다.

## 4. Vertical Slice 작업 단위

### Slice 1. 프론트엔드 앱 스캐폴딩

- Type: AFK
- Blocked by: 없음
- 목표: Next.js App Router 기반 프로젝트를 생성하고 기본 도구를 설치한다.
- 포함 범위:
  - `budgetflow-frontend` 앱 생성
  - Tailwind CSS 설정
  - shadcn/ui 초기화
  - TanStack Query Provider 추가
  - 기본 route group 구성
- 완료 기준:
  - 로컬 dev server가 실행된다.
  - `/login`, `/projects`, `/expenses`, `/settings` 경로가 빈 화면이라도 열린다.

### Slice 2. 도메인 타입과 Mock API 고정

- Type: AFK
- Blocked by: Slice 1
- 목표: 백엔드 없이도 화면 개발이 가능하도록 프론트 도메인 계약을 만든다.
- 포함 범위:
  - Organization, Project, BudgetCategory, Expense, EvidenceFile, ExportJob 타입
  - 지출/증빙/export 상태 union type
  - Mock projects, categories, expenses, export job 데이터
  - `lib/api/projects.ts`, `lib/api/expenses.ts`, `lib/api/exports.ts`
- 완료 기준:
  - Query hook이 Mock API를 통해 데이터를 가져온다.
  - 실제 API 교체 지점이 `lib/api` 안으로 제한된다.

### Slice 3. 로그인 화면

- Type: HITL
- Blocked by: Slice 1
- 목표: Cognito 연동 전에도 관리자 로그인 진입점을 만든다.
- 포함 범위:
  - 이메일/비밀번호 로그인 UI
  - 개발 모드 Mock 로그인
  - Cognito 설정값 placeholder
  - 로그인 후 프로젝트 목록 이동
- 완료 기준:
  - 백엔드 Cognito 정보 없이도 개발 로그인으로 대시보드 진입이 가능하다.
  - Cognito User Pool ID와 App Client ID가 오면 교체할 위치가 명확하다.

### Slice 4. 프로젝트 목록 및 생성

- Type: AFK
- Blocked by: Slice 2
- 목표: 관리자가 행사 단위 프로젝트를 만들고 선택한다.
- 포함 범위:
  - 프로젝트 목록
  - 프로젝트 생성 폼
  - 총 예산, 상태, 슬랙 채널 연결 상태 표시
- 완료 기준:
  - 프로젝트를 생성하면 목록에 반영된다.
  - 프로젝트 선택 시 지출 목록으로 이동한다.

### Slice 5. 지출 목록 핵심 화면

- Type: AFK
- Blocked by: Slice 2, Slice 4
- 목표: 프론트엔드 MVP의 핵심인 지출 관리 테이블을 완성한다.
- 포함 범위:
  - 날짜, 사용처, 설명, 카테고리, 금액, 결제자, 증빙, 상태 컬럼
  - 상태 필터: 전체, processing, needs_review, approved, rejected
  - needs_review 강조 뱃지
  - 5초 폴링
  - 마지막 갱신 시각 표시
- 완료 기준:
  - Mock 지출 데이터가 테이블에 표시된다.
  - 상태 필터와 폴링이 동작한다.

### Slice 6. needs_review 검토 및 수정

- Type: AFK
- Blocked by: Slice 5
- 목표: 관리자가 AI 분석 결과를 수정하고 승인/반려한다.
- 포함 범위:
  - 지출 상세 사이드 패널 또는 모달
  - 날짜, 금액, 카테고리, 설명 수정 폼
  - 승인 시 `approved`
  - 반려 시 `rejected`
  - 선택 반려 사유 입력
- 완료 기준:
  - needs_review 항목을 열어 수정할 수 있다.
  - 승인/반려 후 목록 상태가 갱신된다.

### Slice 7. 정산 마감 및 엑셀 다운로드

- Type: AFK
- Blocked by: Slice 5, Slice 6
- 목표: confirmed 또는 approved 항목 기준으로 제출 파일 생성 흐름을 보여준다.
- 포함 범위:
  - 정산 마감 버튼
  - 마감 확인 모달
  - needs_review 제외 경고
  - export job 생성 Mock
  - 생성 중/완료/실패 상태 표시
  - Presigned URL 링크 표시 Mock
- 완료 기준:
  - needs_review가 남아 있으면 경고가 표시된다.
  - 생성 완료 후 다운로드 링크가 활성화된다.

### Slice 8. 설정 화면: 카테고리와 예산 한도

- Type: AFK
- Blocked by: Slice 2, Slice 4
- 목표: 카테고리별 예산 한도와 분류 기준을 관리한다.
- 포함 범위:
  - 카테고리 목록
  - 예산 한도 입력
  - 키워드 입력
  - 카테고리별 사용액/잔액 표시
- 완료 기준:
  - 카테고리를 추가/수정할 수 있다.
  - 지출 목록 금액 기준으로 카테고리별 소진율이 계산된다.

### Slice 9. 양식 업로드 화면

- Type: HITL
- Blocked by: Slice 4
- 목표: 엑셀 양식 업로드 진입점을 만든다.
- 포함 범위:
  - 파일 선택 UI
  - 업로드 상태 Mock
  - 컬럼 매핑 추천 결과 placeholder
  - 관리자 매핑 확정 placeholder
- 완료 기준:
  - xlsx 파일을 선택하고 업로드 진행 상태를 볼 수 있다.
  - MVP 2차의 LLM 컬럼 매핑 UI로 확장 가능한 구조다.

## 5. 우선 개발 순서

```text
1. Slice 1 - 앱 스캐폴딩
2. Slice 2 - 도메인 타입과 Mock API
3. Slice 4 - 프로젝트 목록 및 생성
4. Slice 5 - 지출 목록 핵심 화면
5. Slice 6 - needs_review 검토 및 수정
6. Slice 7 - 정산 마감 및 엑셀 다운로드
7. Slice 3 - 로그인 화면
8. Slice 8 - 카테고리와 예산 한도
9. Slice 9 - 양식 업로드 화면
```

로그인은 실제 Cognito 정보가 필요하므로 개발 모드 Mock 로그인으로 먼저 우회한다. 발표 시연의 핵심은 지출 목록, 검토, 엑셀 다운로드 흐름이므로 해당 경로를 먼저 완성한다.

## 6. 팀에 바로 요청할 것

- 백엔드: Cognito User Pool ID, App Client ID, API 엔드포인트 초안, Expense 응답 구조
- LLM/OCR: `needs_review` 판정에 들어가는 confidence 기준과 누락 필드 목록 구조
- 봇: Slack 사용자/채널 정보가 Expense에 어떤 형태로 들어오는지
- 전체 팀: 상태값 명칭을 `confirmed`로 쓸지 `approved`로 쓸지 최종 통일

## 7. 다음 실행 단계

첫 구현 단계는 `Slice 1. 프론트엔드 앱 스캐폴딩`이다.

실행할 작업:

```text
npx create-next-app@latest budgetflow-frontend --typescript --tailwind --app
shadcn/ui 초기화
TanStack Query, React Hook Form, Zod 설치
route group과 provider 구성
로컬 dev server 실행 확인
```
