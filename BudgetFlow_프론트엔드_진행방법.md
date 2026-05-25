# BudgetFlow 프론트엔드 진행방법

## 역할 요약

관리자가 지출 현황을 확인하고, AI 분석 결과를 검토·수정하고, 엑셀을 다운로드하는 **웹 대시보드**를 담당한다.
백엔드 API가 완성되기 전에도 독립적으로 개발을 진행할 수 있는 것이 핵심이다.

---

## 기술 스택

| 영역       | 기술                          | 용도                  |
| ---------- | ----------------------------- | --------------------- |
| 프레임워크 | Next.js (App Router)          | 라우팅, 레이아웃      |
| 언어       | TypeScript                    | 타입 안전성           |
| 스타일링   | Tailwind CSS + shadcn/ui      | UI 컴포넌트           |
| 서버 상태  | TanStack Query                | API 데이터 페칭, 폴링 |
| 폼         | React Hook Form + Zod         | 입력 유효성 검증      |
| 인증       | Amazon Cognito (Amplify Auth) | 로그인, 권한          |
| 배포       | AWS Amplify Hosting           | CI/CD 자동화          |

---

## 개발 순서

### Phase 1 — 환경 구성 (Day 1)

```
1. Next.js 프로젝트 생성
   npx create-next-app@latest budgetflow-frontend --typescript --tailwind --app

2. shadcn/ui 설치
   npx shadcn@latest init

3. TanStack Query, React Hook Form, Zod 설치

4. AWS Amplify CLI 설치 및 Cognito 연동 설정

5. 폴더 구조 잡기
   app/
     (auth)/login/
     (dashboard)/
       projects/
       expenses/
       settings/
   components/
   lib/
     api/       ← API 호출 함수 모음
     hooks/     ← TanStack Query 훅 모음
```

### Phase 2 — Mock 데이터로 UI 먼저 완성 (Day 2~4)

백엔드 API가 준비되지 않아도 UI를 완성할 수 있는 방법이다.

```
lib/api/ 폴더에 API 함수를 인터페이스로만 정의
→ 개발 환경에서는 하드코딩된 Mock 데이터 반환
→ 백엔드 완성 후 실제 API 호출로 교체

예시:
  // lib/api/expenses.ts
  export async function getExpenses(projectId: string) {
    if (process.env.NODE_ENV === 'development') {
      return MOCK_EXPENSES  // 하드코딩 목업
    }
    return fetch(`/api/expenses?projectId=${projectId}`)
  }
```

**화면 개발 순서 (MVP 1차):**

```
① 로그인 화면 (Cognito)
② 프로젝트 목록 / 생성 화면
③ 지출 목록 화면 ← 가장 핵심, 여기서 가장 많은 시간 투자
④ needs_review 항목 검토·수정 화면
⑤ 정산 마감 버튼 + 엑셀 다운로드
```

### Phase 3 — 실시간 갱신 및 상태 관리 (Day 5)

```typescript
// 5초 폴링으로 슬랙에서 들어온 새 항목 자동 갱신
const { data } = useQuery({
  queryKey: ["expenses", projectId],
  queryFn: () => getExpenses(projectId),
  refetchInterval: 5000,
});
```

### Phase 4 — 백엔드 연동 (백엔드 팀 API 완성 후)

Mock 함수를 실제 API 호출로 교체하는 작업만 하면 된다.
UI 코드는 그대로 유지된다.

---

## 화면별 핵심 구현 포인트

### 지출 목록 화면

- `needs_review` 상태인 행은 빨간 뱃지 또는 강조 표시
- 상태별 필터 (전체 / needs_review / confirmed / rejected)
- 5초 폴링으로 슬랙 입력 결과가 자동 반영됨을 관리자가 인지할 수 있도록 "마지막 갱신: X초 전" 표시

### needs_review 검토 화면

- 항목 클릭 시 사이드 패널 또는 모달로 상세 표시
- 수정 가능 필드: 날짜, 금액, 카테고리, 설명
- [확인] 클릭 시 `confirmed`로 상태 변경
- [반려] 클릭 시 `rejected`로 상태 변경 (사유 입력 선택)
- 영수증 이미지가 있으면 미리보기 (MVP 2차)

### 엑셀 다운로드

```
[정산 마감] 클릭
  → 확인 모달: "마감 후에는 슬랙 입력이 차단됩니다"
  → 확정 시 프로젝트 상태 closed

[엑셀 다운로드] 클릭
  → needs_review 항목이 있으면 경고:
    "검토 필요 항목 N건은 제외됩니다. 그래도 생성하시겠습니까?"
  → 생성 중 로딩 스피너
  → 완료 시 다운로드 링크 활성화
```

---

## 팀 내 의존성

| 받아야 하는 것                          | 제공하는 팀      | 시점                 |
| --------------------------------------- | ---------------- | -------------------- |
| 백엔드 API 엔드포인트 목록 및 응답 구조 | 백엔드           | Phase 4 시작 전      |
| Cognito User Pool ID / App Client ID    | 백엔드           | Phase 1 환경 구성 시 |
| needs_review 판정 기준 및 상태값 정의   | LLM/OCR + 백엔드 | Phase 2 시작 전      |

---

## 주의사항

- **Cognito 설정은 백엔드 팀에서 먼저 생성**해야 프론트가 연동 가능하다. Phase 1에서 바로 요청할 것.
- shadcn/ui의 `DataTable` 컴포넌트를 지출 목록에 활용하면 필터·정렬·페이지네이션을 빠르게 구현할 수 있다.
- 엑셀 다운로드는 S3 Presigned URL을 직접 `<a href>` 태그로 열면 되고, 별도 구현이 필요 없다.
- AWS Amplify Hosting은 `main` 브랜치 푸시 시 자동 배포되므로 초반에 세팅해두면 팀원들이 중간 결과물을 브라우저에서 바로 확인할 수 있다.
