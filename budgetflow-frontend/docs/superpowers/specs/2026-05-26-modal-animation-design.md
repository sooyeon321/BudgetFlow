# Modal & Animation 설계 — BudgetFlow Web

**날짜**: 2026-05-26  
**대상**: `budgetflow-web` (Next.js + shadcn/ui)  
**상태**: 승인됨

---

## 1. 범위

### 새 의존성

| 패키지                  | 버전   | 용도                                   |
| ----------------------- | ------ | -------------------------------------- |
| `framer-motion`         | latest | 목록 stagger, 페이지 전환              |
| shadcn/ui `Dialog`      | —      | 지출 상세 모달 (이미 설치된 경우 스킵) |
| shadcn/ui `AlertDialog` | —      | 승인/반려 확인 다이얼로그              |

### 변경 대상

| 파일/컴포넌트                                         | 변경 내용                                  |
| ----------------------------------------------------- | ------------------------------------------ |
| `src/components/expenses/expense-detail-modal.tsx`    | 신규: 기존 review pane → Dialog 모달       |
| `src/components/expenses/approval-confirm-dialog.tsx` | 신규: 승인/반려 AlertDialog                |
| `src/components/expenses/animated-expense-list.tsx`   | 신규: stagger 목록 래퍼                    |
| `src/app/layout.tsx`                                  | 수정: AnimatePresence 페이지 전환 추가     |
| expenses 페이지                                       | 수정: review pane 제거, 새 컴포넌트로 교체 |

### 변경하지 않는 것

- 프로젝트 생성 슬라이드 패널 (Sheet 유지)
- 엑셀 내보내기 흐름
- 설정 탭 구조
- 기존 CSS transition (버튼 hover 등 micro-interaction)

---

## 2. 컴포넌트 설계

### `<ExpenseDetailModal>`

**경로**: `src/components/expenses/expense-detail-modal.tsx`  
**기반**: shadcn/ui `Dialog`

```
트리거: 지출 목록 행 클릭
크기: max-w-2xl, 내부 스크롤 가능
닫기: 배경 클릭 또는 ESC 키
```

**내용 (기존 review pane 이식)**:

- 헤더: 지출명, 금액, 상태 배지
- AI 분석 섹션: 신뢰도 바, 분류 결과
- 검토 사유 목록 (needs_review 조건 해당 항목)
- 증빙 이미지 썸네일 / 업로드 영역
- 푸터: 승인 버튼, 반려 버튼 → 각각 `<ApprovalConfirmDialog>` 트리거

### `<ApprovalConfirmDialog>`

**경로**: `src/components/expenses/approval-confirm-dialog.tsx`  
**기반**: shadcn/ui `AlertDialog`

```
트리거: ExpenseDetailModal 내부 승인/반려 버튼
```

**내용**:

- 제목: "승인하시겠습니까?" / "반려하시겠습니까?"
- 요약: 지출명 + 금액 + 카테고리
- 반려 시: 사유 입력 textarea (필수)
- 버튼: 취소(ghost) / 승인(emerald) 또는 반려(red)

### `<AnimatedExpenseList>`

**경로**: `src/components/expenses/animated-expense-list.tsx`  
**기반**: Framer Motion `motion.ul` + `AnimatePresence`

```
용도: 지출 목록 항목의 stagger 등장 애니메이션
트리거: 페이지 진입, 필터 탭 전환
```

---

## 3. 애니메이션 규칙

### 모달 (shadcn/ui 기본값 사용)

```
진입: scale(0.95) + opacity 0→1 / 150ms / ease-out
퇴장: scale(0.95) + opacity 1→0 / 100ms / ease-in
커스터마이징 없음 — Radix UI 기본 동작 유지
```

### 목록 Stagger (Framer Motion)

```ts
// 각 항목 variants
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut", delay: i * 0.04 },
  }),
};
```

- stagger delay: `index × 40ms`
- 최대 10개 기준 총 400ms 이내 완료

### 페이지 전환 (Framer Motion)

```ts
// layout.tsx에서 AnimatePresence 사용
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
};
```

- 진입만 애니메이션 (퇴장 없음 — 업무 흐름 방해 방지)

### Micro-interaction (기존 CSS 유지)

```
버튼 hover:      transition 80ms
배지 상태 전환: transition 150ms
토스트:          shadcn/ui Sonner 기본값
```

### 접근성

```tsx
// Framer Motion의 reduced motion 대응
import { useReducedMotion } from "framer-motion";

const shouldReduceMotion = useReducedMotion();
const duration = shouldReduceMotion ? 0 : 0.25;
```

---

## 4. 데이터 흐름

```
expenses 페이지
  └─ <AnimatedExpenseList>
       └─ <ExpenseRow> (클릭 시 selectedExpense 상태 설정)
            └─ <ExpenseDetailModal open={selectedExpense !== null}>
                 ├─ [승인 버튼] → <ApprovalConfirmDialog type="approve">
                 └─ [반려 버튼] → <ApprovalConfirmDialog type="reject">
```

- `selectedExpense` 상태: expenses 페이지 또는 context에서 관리
- 승인/반려 완료 후: 모달 닫기 → 목록 갱신 (TanStack Query invalidate)

---

## 5. 미결 사항

- [ ] `Dialog`, `AlertDialog`가 이미 설치되어 있는지 확인 후 없으면 `npx shadcn add` 실행
- [ ] `selectedExpense` 상태를 페이지 로컬로 관리할지 Context로 올릴지 — 현재 구조 확인 후 결정
