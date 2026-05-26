# Modal & Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `ReviewPanel` sidebar with a Dialog modal, replace `window.prompt()` and `ConfirmModal` with AlertDialog components, and add Framer Motion stagger animation to the expense list.

**Architecture:** shadcn/ui `Dialog` wraps the existing expense review form content; `AlertDialog` replaces the custom `ConfirmModal` div overlay and the `window.prompt()` rejection flow. Framer Motion is added only for list stagger and page-level fade — shadcn/ui handles modal entry/exit animations via `tw-animate-css`.

**Tech Stack:** Next.js 16 App Router · shadcn/ui (Dialog, AlertDialog, Textarea) · Framer Motion · TanStack Query · React Hook Form · Zod

---

## File Map

| 파일                                                  | 작업                                                 |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `src/components/ui/dialog.tsx`                        | 신규 — shadcn Dialog                                 |
| `src/components/ui/alert-dialog.tsx`                  | 신규 — shadcn AlertDialog                            |
| `src/components/ui/textarea.tsx`                      | 신규 — shadcn Textarea                               |
| `src/components/expenses/expense-detail-modal.tsx`    | 신규 — Dialog 기반 지출 검토 모달                    |
| `src/components/expenses/approval-confirm-dialog.tsx` | 신규 — AlertDialog 기반 승인/반려/마감/내보내기 확인 |
| `src/components/expenses/animated-expense-list.tsx`   | 신규 — Framer Motion stagger 목록                    |
| `src/app/(dashboard)/expenses/expenses-client.tsx`    | 수정 — 새 컴포넌트로 교체                            |
| `src/app/(dashboard)/layout.tsx`                      | 수정 — 페이지 전환 클라이언트 래퍼                   |
| `src/components/page-transition.tsx`                  | 신규 — AnimatePresence 클라이언트 컴포넌트           |

---

## Task 0: 의존성 설치 및 shadcn 컴포넌트 추가

**Files:**

- Install: `framer-motion`
- Create: `src/components/ui/dialog.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/textarea.tsx`

- [ ] **Step 1: framer-motion 설치**

```bash
cd budgetflow-frontend && npm install framer-motion
```

Expected: `package.json`에 `"framer-motion"` 추가됨

- [ ] **Step 2: shadcn Dialog, AlertDialog, Textarea 추가**

```bash
cd budgetflow-frontend && npx shadcn add dialog alert-dialog textarea
```

Expected: `src/components/ui/` 에 `dialog.tsx`, `alert-dialog.tsx`, `textarea.tsx` 생성됨

- [ ] **Step 3: 생성 확인**

```bash
ls budgetflow-frontend/src/components/ui/
```

Expected: `alert-dialog.tsx  button.tsx  dialog.tsx  textarea.tsx`

- [ ] **Step 4: 커밋**

```bash
git add budgetflow-frontend/package.json budgetflow-frontend/package-lock.json budgetflow-frontend/src/components/ui/
git commit -m "chore: add framer-motion and shadcn Dialog/AlertDialog/Textarea"
```

---

## Task 1: ApprovalConfirmDialog 컴포넌트

**Files:**

- Create: `src/components/expenses/approval-confirm-dialog.tsx`

이 컴포넌트는 4가지 시나리오를 모두 처리한다:

- `approve` — 지출 승인 확인
- `reject` — 반려 사유 입력 + 확인 (textarea 포함)
- `close` — 정산 마감 확인
- `export` — 엑셀 내보내기 확인 (검토 필요 건 수 표시)

- [ ] **Step 1: 파일 작성**

`src/components/expenses/approval-confirm-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

type ApprovalConfirmVariant = "approve" | "reject" | "close" | "export";

interface ApprovalConfirmDialogProps {
  open: boolean;
  variant: ApprovalConfirmVariant;
  /** approve/reject: 지출명. close/export: undefined */
  expenseName?: string;
  /** export 전용: 제외될 검토 필요 건수 */
  excludeCount?: number;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}

const variantConfig: Record<
  ApprovalConfirmVariant,
  {
    title: string;
    description: (ctx: { name?: string; count?: number }) => string;
    confirmLabel: string;
    confirmClass: string;
  }
> = {
  approve: {
    title: "지출을 승인할까요?",
    description: ({ name }) =>
      `"${name}"을 승인합니다. 승인 후 엑셀 생성 대상에 포함됩니다.`,
    confirmLabel: "승인",
    confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  reject: {
    title: "지출을 반려할까요?",
    description: ({ name }) =>
      `"${name}" 반려 사유를 입력하세요. 사유는 Slack으로 전달됩니다.`,
    confirmLabel: "반려",
    confirmClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  close: {
    title: "정산을 마감할까요?",
    description: () =>
      "마감 후에는 Slack 입력이 차단된 상태로 표시됩니다. 늦은 증빙이 있다면 먼저 검토하세요.",
    confirmLabel: "정산 마감",
    confirmClass: "",
  },
  export: {
    title: "검토 필요 항목을 제외하고 생성할까요?",
    description: ({ count }) =>
      `검토 필요 항목 ${count ?? 0}건은 제외됩니다. 승인 완료 항목만 포함해 지출내역서를 생성합니다.`,
    confirmLabel: "엑셀 생성",
    confirmClass: "",
  },
};

export function ApprovalConfirmDialog({
  open,
  variant,
  expenseName,
  excludeCount,
  isPending,
  onCancel,
  onConfirm,
}: ApprovalConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const config = variantConfig[variant];

  const handleConfirm = () => {
    onConfirm(variant === "reject" ? reason : undefined);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onCancel();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {config.description({ name: expenseName, count: excludeCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {variant === "reject" && (
          <div className="mt-2">
            <Textarea
              autoFocus
              className="resize-none"
              onChange={(e) => setReason(e.target.value)}
              placeholder="반려 사유를 입력하세요 (선택)"
              rows={3}
              value={reason}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onCancel}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            className={config.confirmClass}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {config.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add budgetflow-frontend/src/components/expenses/approval-confirm-dialog.tsx
git commit -m "feat: add ApprovalConfirmDialog component"
```

---

## Task 2: ExpenseDetailModal 컴포넌트

**Files:**

- Create: `src/components/expenses/expense-detail-modal.tsx`

기존 `ReviewPanel`의 내용을 Dialog 모달로 이식. `window.prompt()` 반려 흐름은 `ApprovalConfirmDialog`로 교체.

- [ ] **Step 1: 파일 작성**

`src/components/expenses/expense-detail-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, CircleX, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { StatusBadge } from "@/components/budgetflow-ui";
import { ApprovalConfirmDialog } from "@/components/expenses/approval-confirm-dialog";
import { SelectInput, TextArea, TextInput } from "@/components/form-controls";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEMO_PROJECT_ID } from "@/lib/config/demo";
import type {
  BudgetCategory,
  EvidenceStatus,
  Expense,
  ExpenseStatus,
} from "@/lib/domain";
import {
  expenseReviewSchema,
  type ExpenseReviewInput,
  type ExpenseReviewValues,
} from "@/lib/forms/expense-review";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  useApproveExpense,
  useRejectExpense,
} from "@/lib/hooks/use-budgetflow";
import { evidenceStatusLabel, expenseStatusLabel } from "@/lib/status";

type StatusTone =
  | "default"
  | "approved"
  | "review"
  | "missing"
  | "processing"
  | "rejected"
  | "exported";

const statusToneByExpenseStatus: Record<ExpenseStatus, StatusTone> = {
  approved: "approved",
  created: "default",
  exported: "exported",
  needs_review: "review",
  processing: "processing",
  rejected: "rejected",
};

const evidenceToneByStatus: Record<EvidenceStatus, StatusTone> = {
  none: "missing",
  ocr_completed: "processing",
  ocr_failed: "missing",
  uploaded: "default",
  verified: "approved",
};

interface ExpenseDetailModalProps {
  expense: Expense | null;
  categories: BudgetCategory[];
  onClose: () => void;
}

type ConfirmVariant = "approve" | "reject" | null;

export function ExpenseDetailModal({
  expense,
  categories,
  onClose,
}: ExpenseDetailModalProps) {
  const [confirmVariant, setConfirmVariant] = useState<ConfirmVariant>(null);
  const approveExpense = useApproveExpense(DEMO_PROJECT_ID);
  const rejectExpense = useRejectExpense(DEMO_PROJECT_ID);

  const form = useForm<ExpenseReviewInput, undefined, ExpenseReviewValues>({
    resolver: zodResolver(expenseReviewSchema),
    values: expense
      ? {
          amount: expense.amount,
          categoryId: expense.categoryId,
          date: expense.date,
          description: expense.description,
          expenseId: expense.id,
        }
      : { amount: 0, categoryId: "", date: "", description: "", expenseId: "" },
  });

  const isMutating = approveExpense.isPending || rejectExpense.isPending;

  const handleApproveConfirm = form.handleSubmit(async (values) => {
    await approveExpense.mutateAsync(values);
    setConfirmVariant(null);
    onClose();
  });

  const handleRejectConfirm = async (reason?: string) => {
    if (!expense) return;
    await rejectExpense.mutateAsync({ expenseId: expense.id, reason });
    setConfirmVariant(null);
    onClose();
  };

  const handleConfirm = async (reason?: string) => {
    if (confirmVariant === "approve") {
      await handleApproveConfirm();
    } else if (confirmVariant === "reject") {
      await handleRejectConfirm(reason);
    }
  };

  return (
    <>
      <Dialog
        open={expense !== null}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {expense && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={statusToneByExpenseStatus[expense.status]}>
                    {expenseStatusLabel[expense.status]}
                  </StatusBadge>
                  <span className="text-sm text-zinc-500">
                    {formatDate(expense.date)}
                  </span>
                </div>
                <DialogTitle className="mt-1">{expense.merchant}</DialogTitle>
                <p className="text-sm text-zinc-600">{expense.description}</p>
              </DialogHeader>

              <div className="space-y-4">
                {expense.reviewReason && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    <AlertTriangle className="size-4 shrink-0" />
                    {expense.reviewReason}
                  </div>
                )}

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-600">AI 신뢰도</span>
                    <span className="font-bold">
                      {Math.round(expense.aiConfidence * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span className="text-zinc-600">금액</span>
                    <span className="font-bold tabular-nums">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span className="text-zinc-600">증빙</span>
                    <StatusBadge
                      tone={evidenceToneByStatus[expense.evidenceStatus]}
                    >
                      {evidenceStatusLabel[expense.evidenceStatus]}
                    </StatusBadge>
                  </div>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setConfirmVariant("approve");
                  }}
                >
                  <input type="hidden" {...form.register("expenseId")} />

                  <FormField
                    error={form.formState.errors.date?.message}
                    label="날짜"
                  >
                    <TextInput type="date" {...form.register("date")} />
                  </FormField>

                  <FormField
                    error={form.formState.errors.amount?.message}
                    label="금액"
                  >
                    <TextInput
                      inputMode="numeric"
                      type="number"
                      {...form.register("amount")}
                    />
                  </FormField>

                  <FormField
                    error={form.formState.errors.categoryId?.message}
                    label="카테고리"
                  >
                    <SelectInput {...form.register("categoryId")}>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </SelectInput>
                  </FormField>

                  <FormField
                    error={form.formState.errors.description?.message}
                    label="설명"
                  >
                    <TextArea {...form.register("description")} />
                  </FormField>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button disabled={isMutating} type="submit">
                      <Check className="mr-2 size-4" />
                      승인
                    </Button>
                    <Button
                      disabled={isMutating}
                      onClick={() => setConfirmVariant("reject")}
                      type="button"
                      variant="destructive"
                    >
                      <CircleX className="mr-2 size-4" />
                      반려
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ApprovalConfirmDialog
        excludeCount={undefined}
        expenseName={expense?.merchant}
        isPending={isMutating}
        onCancel={() => setConfirmVariant(null)}
        onConfirm={(reason) => void handleConfirm(reason)}
        open={confirmVariant !== null}
        variant={confirmVariant ?? "approve"}
      />
    </>
  );
}
```

- [ ] **Step 2: `BudgetCategory` 타입이 `domain.ts`에 있는지 확인**

```bash
rg "BudgetCategory" budgetflow-frontend/src/lib/domain.ts
```

없으면 `Expense`가 참조하는 카테고리 타입명을 확인한 후 import 수정.

- [ ] **Step 3: 커밋**

```bash
git add budgetflow-frontend/src/components/expenses/expense-detail-modal.tsx
git commit -m "feat: add ExpenseDetailModal component"
```

---

## Task 3: AnimatedExpenseList 컴포넌트

**Files:**

- Create: `src/components/expenses/animated-expense-list.tsx`

- [ ] **Step 1: 파일 작성**

`src/components/expenses/animated-expense-list.tsx`:

```tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface AnimatedExpenseListProps {
  listKey: string;
  children: React.ReactNode[];
}

export function AnimatedExpenseList({
  listKey,
  children,
}: AnimatedExpenseListProps) {
  const shouldReduce = useReducedMotion();

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduce ? 0 : 0.25,
        ease: "easeOut",
        delay: shouldReduce ? 0 : i * 0.04,
      },
    }),
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={listKey}>
        {children.map((child, i) => (
          <motion.div
            custom={i}
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            key={i}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add budgetflow-frontend/src/components/expenses/animated-expense-list.tsx
git commit -m "feat: add AnimatedExpenseList with Framer Motion stagger"
```

---

## Task 4: expenses-client.tsx 통합

**Files:**

- Modify: `src/app/(dashboard)/expenses/expenses-client.tsx`

기존 `ReviewPanel` + `ConfirmModal` 제거, 새 컴포넌트로 교체. 레이아웃에서 우측 패널 컬럼도 제거.

- [ ] **Step 1: import 교체**

`expenses-client.tsx` 상단에서:

1. 기존 `import { Check, CircleX, ... }` 에서 더 이상 필요 없는 아이콘 제거 (Check, CircleX는 모달로 이동했으므로 제거)
2. 새 import 추가:

```tsx
import { AnimatedExpenseList } from "@/components/expenses/animated-expense-list";
import { ApprovalConfirmDialog } from "@/components/expenses/approval-confirm-dialog";
import { ExpenseDetailModal } from "@/components/expenses/expense-detail-modal";
```

- [ ] **Step 2: state 정리**

`ExpensesClient` 함수 내 state:

```tsx
// 기존 유지
const [status, setStatus] = useState<ExpenseStatus | "all">("all");
const [searchQuery, setSearchQuery] = useState("");
const [selectedExpenseId, setSelectedExpenseId] = useState<
  string | null | undefined
>(undefined);

// 기존 confirmCloseOpen/confirmExportOpen 유지 → ApprovalConfirmDialog로 교체
const [confirmVariant, setConfirmVariant] = useState<"close" | "export" | null>(
  null,
);
```

- [ ] **Step 3: JSX 교체**

기존 `<section className="grid ... xl:grid-cols-[minmax(0,1fr)_400px]">` 블록에서:

1. `xl:grid-cols-[minmax(0,1fr)_400px]` → `xl:grid-cols-1` (단일 컬럼으로)
2. `<ReviewPanel ... />` 라인 전체 제거
3. 지출 목록 tbody `visibleExpenses.map(...)` → `<AnimatedExpenseList>` 로 래핑:

```tsx
// 데스크톱 테이블 tbody 내부
<AnimatedExpenseList listKey={`${status}-${searchQuery}`}>
  {visibleExpenses.map((expense) => (
    <ExpenseTableRow
      key={expense.id}
      categoryName={categoryNameById.get(expense.categoryId) ?? "미분류"}
      expense={expense}
      isSelected={expense.id === effectiveSelectedExpenseId}
      onSelect={() => setSelectedExpenseId(expense.id)}
    />
  ))}
</AnimatedExpenseList>
```

**주의:** `AnimatedExpenseList`는 `<div>` 래퍼를 사용하므로 `<tbody>` 내에 직접 쓰면 유효하지 않은 HTML이 됩니다. 대신 모바일 카드 목록에 적용하고, 테이블은 tbody에 직접 `motion.tr`을 적용하거나 테이블 구조를 `div`기반으로 교체합니다.

모바일 카드 목록 교체:

```tsx
<div className="divide-y divide-zinc-100 md:hidden">
  <AnimatedExpenseList listKey={`mobile-${status}-${searchQuery}`}>
    {visibleExpenses.map((expense) => (
      <ExpenseMobileCard
        key={expense.id}
        categoryName={categoryNameById.get(expense.categoryId) ?? "미분류"}
        expense={expense}
        isSelected={expense.id === effectiveSelectedExpenseId}
        onSelect={() => setSelectedExpenseId(expense.id)}
      />
    ))}
  </AnimatedExpenseList>
</div>
```

- [ ] **Step 4: 확인 다이얼로그 교체**

기존 `{confirmCloseOpen ? <ConfirmModal ... /> : null}` 두 블록 제거.

대신 파일 끝 (return 바깥이 아니라 return 내부 끝) 에 추가:

```tsx
<ApprovalConfirmDialog
  open={confirmVariant === "close"}
  variant="close"
  isPending={closeProjectMutation.isPending}
  onCancel={() => setConfirmVariant(null)}
  onConfirm={() => void closeProject()}
/>

<ApprovalConfirmDialog
  open={confirmVariant === "export"}
  variant="export"
  excludeCount={summaryQuery.data?.needsReviewCount ?? 0}
  isPending={requestExportMutation.isPending}
  onCancel={() => setConfirmVariant(null)}
  onConfirm={() => void requestExport()}
/>

<ExpenseDetailModal
  expense={selectedExpense}
  categories={categoriesQuery.data ?? []}
  onClose={() => setSelectedExpenseId(null)}
/>
```

- [ ] **Step 5: 기존 버튼 onClick 업데이트**

```tsx
// 정산 마감 버튼
onClick={onCloseClick}  →  onClick={() => setConfirmVariant("close")}

// 엑셀 생성 버튼
onClick={onExportClick}
// 기존 needsReviewCount 분기 로직 → ApprovalConfirmDialog variant="export"가 처리하므로:
onClick={() => {
  if ((summaryQuery.data?.needsReviewCount ?? 0) > 0) {
    setConfirmVariant("export");
  } else {
    void requestExport();
  }
}}
```

- [ ] **Step 6: 미사용 컴포넌트 제거**

`expenses-client.tsx` 파일 하단의 `ConfirmModal` 함수 전체 삭제 (560-592줄).
`ReviewPanel` 함수 전체 삭제 (594-735줄).

- [ ] **Step 7: 빌드 확인**

```bash
cd budgetflow-frontend && npm run build 2>&1 | tail -20
```

Expected: 타입 에러 없이 빌드 완료. 에러 발생 시 메시지 기반으로 수정.

- [ ] **Step 8: 커밋**

```bash
git add budgetflow-frontend/src/app/\(dashboard\)/expenses/expenses-client.tsx
git commit -m "feat: integrate ExpenseDetailModal and ApprovalConfirmDialog into expenses page"
```

---

## Task 5: 페이지 전환 애니메이션

**Files:**

- Create: `src/components/page-transition.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

`DashboardLayout`은 Server Component이므로 `AnimatePresence`를 직접 쓸 수 없다. 클라이언트 래퍼를 분리한다.

- [ ] **Step 1: PageTransition 클라이언트 컴포넌트 작성**

`src/components/page-transition.tsx`:

```tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: shouldReduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduce ? 0 : 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: DashboardLayout에 적용**

`src/app/(dashboard)/layout.tsx` 수정:

```tsx
import { PageTransition } from "@/components/page-transition";

// <main> 내부 {children} 을 PageTransition으로 감싼다
<main className="...">
  <PageTransition>{children}</PageTransition>
</main>;
```

- [ ] **Step 3: 빌드 + 동작 확인**

```bash
cd budgetflow-frontend && npm run build 2>&1 | tail -10
```

Expected: 빌드 성공. 브라우저에서 Projects → Expenses 이동 시 fade-in 확인.

- [ ] **Step 4: 커밋**

```bash
git add budgetflow-frontend/src/components/page-transition.tsx budgetflow-frontend/src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add page transition fade with Framer Motion AnimatePresence"
```

---

## Self-Review

**스펙 커버리지 확인:**

- ✅ `ExpenseDetailModal` (Dialog, 지출 상세) — Task 2
- ✅ `ApprovalConfirmDialog` (AlertDialog, 승인/반려/마감/내보내기) — Task 1, 4
- ✅ `window.prompt()` 제거 → textarea AlertDialog — Task 1
- ✅ `ConfirmModal` 제거 → AlertDialog — Task 4
- ✅ `AnimatedExpenseList` stagger — Task 3
- ✅ 페이지 전환 fade — Task 5
- ✅ `prefers-reduced-motion` 대응 — Task 3, 5
- ✅ shadcn 기본 모달 애니메이션 (커스터마이징 없음) — Task 0

**미결 사항 (구현 시 확인):**

- `BudgetCategory` 타입명: `domain.ts`에서 실제 export 이름 확인 (Task 2 Step 2)
- `AnimatedExpenseList`의 `<div>` 래퍼가 `<tbody>` 내부에 올 수 없는 문제: 데스크톱 테이블은 `motion.tr`로 직접 처리하거나 div-기반 레이아웃으로 전환 필요 (Task 4 Step 3 주의사항)
