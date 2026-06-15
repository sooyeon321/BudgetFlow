# BudgetFlow Design System and Carbon Application Plan

## Source of truth

- Status: Active
- Last refreshed: 2026-06-15
- Primary product surfaces: `/login`, `/projects`, `/expenses`, `/settings`
- Canonical scope: BudgetFlow product UX, frontend design system, Carbon-inspired application rules, and current implementation decisions
- This document supersedes `budgetflow-frontend/DESIGN.md` and `product-reference/DESIGN.md` for current frontend/design decisions.
- Evidence reviewed:
  - `README.md`
  - `docs/BudgetFlow_디자인_기획서.md`
  - `docs/BudgetFlow_기획서_현행화.md`
  - `docs/BudgetFlow_MVP_전체정리.md`
  - `docs/carbon-design-system.md`
  - `budgetflow-frontend/DESIGN.md`
  - `product-reference/DESIGN.md`
  - `budgetflow-frontend/src/app/**`
  - `budgetflow-frontend/src/components/**`
  - `budgetflow-frontend/src/lib/domain.ts`
  - `budgetflow-frontend/src/lib/status-tone.ts`

## One-page summary

BudgetFlow는 Slack으로 들어온 지출 설명과 증빙을 AI가 구조화하고, 관리자가 웹 대시보드에서 검토·승인한 뒤 제출용 엑셀을 내려받는 팀 단위 예산 정산 자동화 서비스다.

Carbon Design System은 전체 UI를 Carbon 컴포넌트로 교체하기 위한 대상이 아니다. BudgetFlow에는 Carbon의 토큰 사고방식, 상태 색상, 2x spacing/grid, 접근성 기준, forms/filtering/dialog/notification 패턴을 선택적으로 적용한다. 제품의 정체성은 조용하고 밀도 있는 한국어 업무형 SaaS로 유지한다.

현재 구현 방향은 다음과 같다.

- Carbon의 역할 기반 토큰 모델을 `--bf-*` CSS 변수로 흡수한다.
- 비용 검토처럼 위험 판단이 필요한 화면은 상태와 근거를 먼저 보이게 한다.
- 버튼, 필터, 콜아웃, 배지, 진행률, 폼 에러는 공통 컴포넌트로 관리한다.
- 접근성은 WCAG AA 수준의 실용 기준을 목표로 하며, 키보드 조작과 스크린리더 의미를 구현 범위에 포함한다.
- Carbon React 패키지 도입은 보류한다. 현재 Next.js, Tailwind CSS v4, shadcn/ui 기반 컴포넌트 체계를 유지한다.

## Repository documentation state

정리된 문서는 `docs/` 아래에 모으고, 루트 `README.md`는 주요 문서 링크를 제공한다. Carbon 공식 문서 조사는 `docs/carbon-design-system.md`에 별도 보존한다. 이 `DESIGN.md`는 조사 결과와 프론트엔드 적용 결정을 합친 최상위 의사결정 문서다.

현재 주요 문서 역할은 다음과 같다.

| 문서 | 역할 |
| --- | --- |
| `DESIGN.md` | 현재 디자인 시스템과 Carbon 적용 기준 |
| `docs/carbon-design-system.md` | Carbon 공식 문서 조사 요약 |
| `docs/BudgetFlow_디자인_기획서.md` | 화면별 와이어프레임과 UI 상세 기획 |
| `docs/BudgetFlow_기획서_현행화.md` | 현행 시스템 구성, 역할 분담, 구현 상태 |
| `docs/BudgetFlow_MVP_전체정리.md` | MVP 범위, 사용자 흐름, API 전환 경계 |
| `budgetflow-frontend/DESIGN.md` | 이전 프론트엔드 디자인 기준. 신규 결정은 루트 `DESIGN.md`를 따른다. |

## Brand

- Personality: 조용한 한국어 SaaS 관리자 도구, 밀도 높고 차분한 운영 중심 화면
- Trust signals: 명확한 상태 언어, 검토 사유 노출, 승인/제외 정책의 명시성, 기관 제출용 엑셀 생성 흐름
- Avoid:
  - 마케팅형 hero 화면
  - 장식용 그래디언트와 과한 카드 레이아웃
  - 한 색상 계열만 반복되는 단조로운 팔레트
  - 근거 없는 자동 승인처럼 보이는 UX
  - 로그인 화면에서 내부 인증 구조를 설명하는 텍스트

## Product goals

- Goals:
  - Slack 지출 입력을 구조화해 수동 엑셀 취합을 줄인다.
  - AI가 불확실한 항목은 사람이 검토하게 한다.
  - 승인된 지출만 제출용 엑셀 생성 대상에 포함한다.
  - 데스크탑에서 반복 검토가 빠르고 안정적으로 이루어지게 한다.
- Non-goals:
  - MVP에서 카카오톡 지원
  - 완전 자동 최종 승인
  - OCR만을 전면에 내세운 제품 포지셔닝
  - Carbon 제품처럼 보이도록 모든 컴포넌트를 교체하는 것
- Success signals:
  - 관리자가 다음에 처리해야 할 위험 항목을 즉시 찾는다.
  - `needs_review`, 증빙 없음, 예산 초과 가능성이 시각적으로 구분된다.
  - 승인/반려/엑셀 생성의 결과와 제외 정책을 오해하지 않는다.
  - `/login -> /projects -> /expenses -> /settings` 시연 흐름이 끊기지 않는다.

## Personas and jobs

- Primary personas:
  - 동아리·행사 회계 담당 관리자
  - 팀 운영 담당자
  - 발표/시연을 수행하는 프로젝트 팀
- User jobs:
  - 프로젝트 생성 및 Slack 채널 매핑 확인
  - 예산 카테고리와 한도 관리
  - AI 분석 결과 검토
  - 지출 승인 또는 반려
  - 정산 마감 및 제출용 엑셀 다운로드
- Key contexts of use:
  - 데스크탑 중심 반복 검토
  - 모바일 보조 확인
  - 수업 프로젝트 시연
  - 백엔드/LLM 연동 전후 모두 유지되어야 하는 프론트엔드 흐름

## Information architecture

- Primary navigation: 로그인 후 Projects, Expenses, Settings
- Core routes:
  - `/login`: 인증만 수행한다.
  - `/projects`: 행사 단위 프로젝트와 예산 현황을 본다.
  - `/expenses`: 지출 목록, 위험 항목, 상세 검토, 승인/반려, 엑셀 생성 흐름을 처리한다.
  - `/settings`: 엑셀 양식, 컬럼 매핑, 예산 카테고리, 분류 키워드를 관리한다.
- Content hierarchy:
  - 1순위: 위험, 미해결 항목, 다음 액션
  - 2순위: 금액, 카테고리, 신뢰도, 증빙 상태
  - 3순위: 배경 설명, 보조 정책, 최근 생성 파일

## System and MVP flow

```text
팀원 Slack 입력
-> Slack 봇 접수 및 파일 업로드
-> 백엔드 API 저장/분석 요청
-> LLM/OCR 분석과 신뢰도 계산
-> 관리자 웹 대시보드 검토
-> 승인 또는 반려
-> approved 항목 기준 엑셀 생성
```

핵심 상태값은 프론트엔드와 백엔드가 공유해야 한다.

| 도메인 | 상태값 | UI 의미 |
| --- | --- | --- |
| Expense | `created` | 접수됨 |
| Expense | `processing` | 분석 중 |
| Expense | `needs_review` | 관리자 검토 필요 |
| Expense | `approved` | 승인 완료, export 포함 가능 |
| Expense | `rejected` | 반려 |
| Expense | `exported` | 엑셀 생성에 포함됨 |
| Evidence | `none` | 증빙 없음, 강한 위험 |
| Evidence | `uploaded` | 증빙 업로드됨 |
| Evidence | `ocr_completed` | OCR 완료 또는 처리됨 |
| Evidence | `ocr_failed` | OCR 실패, 검토 필요 |
| Evidence | `verified` | 증빙 확인됨 |

## Carbon principles to apply

Carbon에서 BudgetFlow에 적용할 부분은 다음이다.

| Carbon 원칙 | BudgetFlow 적용 |
| --- | --- |
| Role-based tokens | 색상과 상태를 hex가 아니라 `--bf-*` 역할 토큰으로 표현 |
| Productive UI | 큰 마케팅 표현보다 밀도 있는 업무형 화면 유지 |
| 2x spacing/grid | 2, 4, 8 기반 간격과 예측 가능한 레이아웃 사용 |
| Clear component variants | primary, secondary, ghost, danger의 역할 구분 |
| Forms and validation | 필드 라벨, 에러, `aria-invalid`, `aria-describedby` 연결 |
| Filtering pattern | 상태 필터를 segmented control로 통일 |
| Dialog pattern | 승인/반려/엑셀 생성 확인은 짧고 직접적인 다이얼로그로 처리 |
| Notifications/callouts | 제외 경고, 생성 파일, 위험 안내는 `Callout`으로 일관화 |
| Accessibility | 색상만으로 상태를 전달하지 않고, focus/keyboard/screen-reader 의미를 제공 |

Carbon에서 그대로 가져오지 않을 부분은 다음이다.

- IBM Plex 기반의 전체 브랜드 톤
- Carbon React 컴포넌트 패키지 전체 도입
- IBM blue를 primary로 사용하는 색상 체계
- IBM 제품형 UI shell 복제
- Carbon처럼 보이기 위한 시각적 모방

## Design principles

- Principle 1: Login is only for logging in.
  - 로그인은 카드 하나, 입력 두 개, 제출 버튼 하나를 기본으로 한다.
  - 서비스 설명, 내부 인증 구조, 대체 탐색 경로를 넣지 않는다.
- Principle 2: Risk before detail.
  - 비용 검토 화면에서는 `needs_review`, 증빙 없음, 신뢰도, 예산 초과 가능성을 먼저 보인다.
  - 상세 정보는 위험 판단을 보조하는 위치에 둔다.
- Principle 3: Human review is the product promise.
  - AI가 판단했다는 사실보다 관리자가 승인할 수 있는 근거와 수정 가능성이 중요하다.
  - 자동 확정처럼 보이는 문구를 피한다.
- Principle 4: One primary action per decision area.
  - 화면 또는 패널 안에서 최종 액션은 하나만 가장 강하게 보이게 한다.
  - 보조 액션은 outline/ghost/danger 역할로 분리한다.
- Principle 5: Tokens over one-off styling.
  - 상태 색상, 레이어, 보더, 텍스트 색상은 공통 토큰을 우선한다.
  - 하드코딩 색상은 새 토큰이 필요한지 먼저 검토한다.

## Visual language

- Color:
  - 기본 레이어는 white/slate 기반으로 유지한다.
  - primary는 BudgetFlow의 teal 계열을 유지한다.
  - success는 승인, warning은 검토, error는 증빙 없음/오류, info는 처리 중에 사용한다.
  - exported는 보조 상태이며 primary보다 강하게 보이면 안 된다.
- Typography:
  - 한국어 업무 UI에 맞게 Pretendard를 포함한 sans stack을 사용한다.
  - 숫자와 금액은 tabular numeric을 유지한다.
  - compact panels 안에서는 hero-scale type을 쓰지 않는다.
  - letter spacing을 음수로 조정하지 않는다.
- Spacing/layout rhythm:
  - 8px 기반 gap을 기본으로 하고, 작은 디테일은 2/4px 단위를 허용한다.
  - 반복 카드와 테이블은 밀도 있게 구성하되 행간과 보더로 스캔 가능성을 확보한다.
- Shape/radius/elevation:
  - 카드와 패널은 8px radius를 기준으로 한다.
  - 중첩 카드와 과한 그림자를 피한다.
- Motion:
  - 진행 상태, 갱신, toast 수준의 짧은 피드백만 사용한다.
  - 자동 재생 또는 필수 애니메이션은 만들지 않는다.
- Imagery/iconography:
  - 장식 이미지는 사용하지 않는다.
  - 데이터, 상태, 버튼 아이콘이 화면의 시각 정보를 담당한다.
  - icon-only control은 44px 이상 target과 accessible name을 가져야 한다.

## Token contract

현재 BudgetFlow token source는 `budgetflow-frontend/src/app/globals.css`다.

주요 semantic aliases:

| Token group | Tokens |
| --- | --- |
| Surface | `--bf-background`, `--bf-layer-01`, `--bf-layer-02`, `--bf-layer-hover`, `--bf-layer-selected` |
| Border | `--bf-border-subtle`, `--bf-border-strong` |
| Text | `--bf-text-primary`, `--bf-text-secondary`, `--bf-text-muted` |
| Primary | `--bf-primary`, `--bf-primary-hover`, `--bf-primary-subtle`, `--bf-primary-muted`, `--bf-focus` |
| Support | `--bf-support-success-*`, `--bf-support-warning-*`, `--bf-support-error-*`, `--bf-support-info-*` |
| Status rows | `--bf-row-missing`, `--bf-row-review` |
| Exported | `--bf-status-exported-*` |

Rules:

- New route-level UI should use semantic `--bf-*` tokens before direct palette tokens.
- Status color must include both text and non-color signal where needed.
- New status values must be added to `src/lib/status-tone.ts` first, then consumed by components.
- One-off hex values in route components are design debt unless they define a new semantic role.

## Components

Existing components to reuse:

- `Button`
- `FormField`
- `Input`
- `Textarea`
- `SummaryCard`
- `Panel`
- `PageHeader`
- `StatusBadge`
- `PriorityStrip`
- `PriorityStep`
- `ProgressBar`
- `SegmentedControl`
- `Callout`

Component rules:

- `StatusBadge` owns visual status tone. Route components should pass a tone, not duplicate class maps.
- `ProgressBar` represents measurable progress and must keep `role="meter"` plus `aria-valuenow`.
- `SegmentedControl` is for mutually exclusive filters or modes. Use `aria-pressed` on options.
- `Callout` is for warnings, generated file status, and policy notices. Do not create ad hoc alert cards.
- `FormField` owns field error semantics. Controls inside it should receive invalid/describedby state through the wrapper.
- `Button` variants:
  - `default`: main action
  - `outline`: secondary action
  - `ghost`: low-emphasis action
  - `destructive`: irreversible or negative action
  - `icon` and `icon-lg`: 44px target size

## Screen guidance

### Login

- 목적은 인증이다.
- 로고, 이메일, 비밀번호, 로그인 버튼, 인라인 에러만 유지한다.
- 비밀번호 표시 버튼은 충분한 hit target과 focus ring을 가져야 한다.
- 모바일에서는 첫 화면이 입력 흐름을 방해하지 않아야 한다.

### Projects

- 전체 프로젝트 상태, 예산 흐름, 검토 필요 수, 양식 준비 상태를 빠르게 파악하게 한다.
- 새 프로젝트 생성은 보조 입력 흐름이며, 위험 항목 이동 CTA보다 강해지면 안 된다.
- 예산 진행률은 `ProgressBar`로 표현한다.

### Expenses

- 이 화면이 제품의 핵심 작업 공간이다.
- 필터는 `SegmentedControl`로 통일한다.
- 증빙 없음은 검토 필요보다 더 강한 위험 상태로 표시한다.
- 행 클릭은 상세 검토 모달로 이어진다.
- 키보드 사용자가 행을 선택하고 상세로 진입할 수 있어야 한다.
- 정산 마감과 엑셀 생성은 결과와 제외 정책을 `Callout`과 확인 다이얼로그로 설명한다.

### Settings

- 탭은 엑셀 양식, 예산 카테고리, 분류 키워드처럼 작업 단위로 나눈다.
- 추천 매핑은 관리자 확정 전 사용되지 않는다는 점을 명확히 한다.
- LLM 추천 신뢰도는 숫자로 보여 주되, 자동 확정처럼 보이면 안 된다.
- 예산 한도와 사용률은 금액과 progress를 함께 보여준다.

## Accessibility

- Target standard: 실용적 WCAG AA
- Keyboard/focus:
  - 모든 버튼, 링크, 필터, 모달 액션, 비용 행은 키보드로 접근 가능해야 한다.
  - focus-visible ring은 제거하지 않는다.
- Contrast/readability:
  - 상태 색상은 텍스트 라벨과 함께 사용한다.
  - 회색 보조 텍스트는 작은 크기에서 대비가 낮아지지 않게 한다.
- Screen-reader semantics:
  - 필드 에러는 `aria-invalid`와 `aria-describedby`를 연결한다.
  - progress는 meter semantics를 사용한다.
  - icon-only action은 accessible name을 가져야 한다.
- Sensory considerations:
  - 색상만으로 위험을 전달하지 않는다.
  - 자동 재생, flashing, 필수 애니메이션을 쓰지 않는다.

## Responsive behavior

- Supported devices: desktop admin workspace, tablet fallback, mobile 360px+
- Desktop:
  - 사이드바 또는 상단 탐색을 통해 반복 업무를 빠르게 이동한다.
  - 테이블과 상세 모달은 정보 밀도를 유지한다.
- Mobile:
  - 하단 탭을 사용한다.
  - 비용 목록은 카드 형태로 전환한다.
  - 주요 CTA는 충분한 touch target을 유지한다.
- Layout checks:
  - 320px, 672px, 1056px 이상에서 horizontal scroll이 생기지 않아야 한다.
  - 고정 포맷 요소는 안정적인 크기와 aspect/width 제약을 가져야 한다.

## Interaction states

- Loading:
  - 분석 중, 수동 새로고침, export 생성 중은 명확한 진행 상태를 표시한다.
- Empty:
  - 필터 결과 없음과 아직 생성된 파일 없음은 다른 메시지로 구분한다.
- Error:
  - 로그인/폼 오류는 필드 가까이에 표시한다.
  - mutation 실패는 관련 액션 영역 근처에 표시한다.
- Success:
  - 승인 완료, 반려 완료, export 생성 완료는 상태 배지와 콜아웃으로 확인시킨다.
- Disabled:
  - pending 중인 버튼은 비활성화하고, 동일 액션 중복 실행을 막는다.
- Slow network:
  - 5초 polling 기반 갱신은 마지막 갱신 시점 또는 갱신 상태를 노출한다.

## Content voice

- Tone: 짧고 직접적인 한국어 운영 도구 문체
- Preferred terminology:
  - 검토 필요
  - 승인 완료
  - 반려
  - 증빙 없음
  - 양식 확정
  - 엑셀 생성
  - 추천 매핑
- Microcopy rules:
  - 버튼은 동작 결과를 말한다. 예: `승인`, `반려`, `엑셀 생성`
  - 위험 안내는 제외 수와 포함 대상을 함께 말한다.
  - AI 관련 문구는 확정이 아니라 추천, 분석, 신뢰도로 표현한다.
  - `확인` 같은 일반 문구는 실제 확인이 결과일 때만 사용한다.

## Implementation constraints

- Framework/styling system:
  - Next.js App Router
  - TypeScript
  - Tailwind CSS v4
  - shadcn/ui
  - TanStack Query
  - lucide-react
- Carbon application constraint:
  - Carbon React package is not installed.
  - Carbon is applied as design principles, token naming discipline, accessibility behavior, and interaction patterns.
- Dependency constraint:
  - New design dependencies require a clear product payoff.
  - Prefer existing components and local tokens.
- Test/screenshot expectations:
  - For substantial frontend changes, run lint, unit tests, production build, and route smoke checks.
  - Visual changes should be checked at desktop and mobile widths before final release.

## Implemented in the latest Carbon application pass

The latest frontend pass implemented the selective Carbon application plan.

Files and areas changed:

- `budgetflow-frontend/src/app/globals.css`
  - Added Carbon-inspired semantic aliases under `--bf-*`.
  - Removed negative tracking from money utility.
- `budgetflow-frontend/src/lib/status-tone.ts`
  - Centralized expense/evidence status to UI tone mapping.
- `budgetflow-frontend/src/components/budgetflow-ui.tsx`
  - Tokenized `StatusBadge`, `Panel`, `PageHeader`, `PriorityStrip`, `PriorityStep`, `ProgressBar`.
  - Added `SegmentedControl`.
  - Added `Callout`.
  - Added `role="meter"` and ARIA values to `ProgressBar`.
- `budgetflow-frontend/src/components/form-field.tsx`
  - Added generated error ids.
  - Propagates `aria-invalid` and `aria-describedby` to child controls.
- `budgetflow-frontend/src/components/form-controls.tsx`
  - Tokenized form colors.
  - Added invalid-state focus/border behavior.
- `budgetflow-frontend/src/components/ui/button.tsx`
  - Aligned variants with primary, secondary, ghost, destructive roles.
  - Increased icon button target size to 44px.
- `budgetflow-frontend/src/app/(dashboard)/expenses/expenses-client.tsx`
  - Replaced ad hoc filters with `SegmentedControl`.
  - Reused centralized status tone mappings.
  - Replaced export warning/generated file blocks with `Callout`.
  - Tokenized missing/review/selected row states.
- `budgetflow-frontend/src/components/expenses/expense-detail-modal.tsx`
  - Reused centralized tone mapping.
  - Tokenized modal surfaces and analysis states.
- `budgetflow-frontend/src/components/expenses/approval-confirm-dialog.tsx`
  - Tokenized confirm states and shortened confirmation copy.
- `budgetflow-frontend/src/app/(dashboard)/settings/settings-client.tsx`
  - Tokenized tabs and added recommendation confidence display.
- `budgetflow-frontend/src/app/(auth)/login/login-client.tsx`
  - Tokenized login surface and improved password reveal target/focus behavior.
- `budgetflow-frontend/src/app/layout.tsx`
  - Moved `themeColor` to the Next viewport export to match Next 16 behavior.
- Tests updated:
  - `summary-card.test.tsx`
  - `form-field.test.tsx`

Verification evidence:

- `npm test` passed: 8 test files, 28 tests
- `npm run lint` passed
- `npm run build` passed
- Route smoke checks passed:
  - `/login` 200
  - `/projects` 200
  - `/expenses` 200
  - `/settings` 200

## Future application checklist

Before adding or changing frontend UI, check:

- Does this UI use `--bf-*` semantic tokens instead of one-off hex colors?
- Is there only one visually dominant primary action in the current decision area?
- Are status values mapped through `status-tone.ts`?
- Does the component expose keyboard and screen-reader semantics?
- Are forms using `FormField` for label/error semantics?
- Could this be `SegmentedControl`, `Callout`, `StatusBadge`, `Panel`, or `SummaryCard` instead of a new local pattern?
- Does the mobile layout preserve touch target size and avoid horizontal scroll?
- Does the copy state the result of the action rather than a vague instruction?
- Is AI output framed as recommendation or analysis until the admin confirms it?

## Open questions

- [ ] Production authentication: should final login add SSO providers or remain email/password only? Owner: product. Impact: login IA.
- [ ] Project selection: should `/expenses` and `/settings` use route params or global selected-project context? Owner: frontend/backend. Impact: navigation and query keys.
- [ ] LLM provider: final Bedrock/OpenAI/Anthropic choice affects confidence wording and error states. Owner: LLM/backend. Impact: review reason semantics.
- [ ] Export policy: should `needs_review` always be excluded or can admins explicitly include a reviewed exception? Owner: product/backend. Impact: dialogs and audit trail.
- [ ] Dark mode: not currently a product goal. If added, `--bf-*` tokens must be completed for `.dark` before route styling changes.
