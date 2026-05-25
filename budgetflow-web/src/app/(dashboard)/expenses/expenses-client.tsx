"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  CircleX,
  Download,
  FileWarning,
  Loader2,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";

import {
  PageHeader,
  Panel,
  PriorityStep,
  PriorityStrip,
  SectionToolbar,
  StatusBadge,
} from "@/components/budgetflow-ui";
import { SelectInput, TextArea, TextInput } from "@/components/form-controls";
import { FormField } from "@/components/form-field";
import { SummaryCard } from "@/components/summary-card";
import { Button } from "@/components/ui/button";
import { DEMO_PROJECT_ID } from "@/lib/config/demo";
import type { EvidenceStatus, Expense, ExpenseStatus, ExportJob, Project } from "@/lib/domain";
import {
  expenseReviewSchema,
  type ExpenseReviewInput,
  type ExpenseReviewValues,
} from "@/lib/forms/expense-review";
import { formatCurrency, formatDate, formatRelativeSeconds } from "@/lib/formatters";
import {
  useApproveExpense,
  useBudgetCategories,
  useCloseProject,
  useExpenses,
  useExpenseSummary,
  useExportJobs,
  useProject,
  useRejectExpense,
  useRequestExpenseReportExport,
} from "@/lib/hooks/use-budgetflow";
import {
  evidenceStatusLabel,
  expenseStatusFilterOptions,
  expenseStatusLabel,
} from "@/lib/status";

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

export function ExpensesClient() {
  const [status, setStatus] = useState<ExpenseStatus | "all">("all");
  const [selectedExpenseId, setSelectedExpenseId] = useState<
    string | null | undefined
  >(undefined);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const projectQuery = useProject(DEMO_PROJECT_ID);
  const expensesQuery = useExpenses(DEMO_PROJECT_ID, status);
  const summaryQuery = useExpenseSummary(DEMO_PROJECT_ID);
  const categoriesQuery = useBudgetCategories(DEMO_PROJECT_ID);
  const exportJobsQuery = useExportJobs(DEMO_PROJECT_ID);
  const closeProjectMutation = useCloseProject(DEMO_PROJECT_ID);
  const requestExportMutation = useRequestExpenseReportExport(DEMO_PROJECT_ID);

  const categoryNameById = useMemo(
    () =>
      new Map(
        categoriesQuery.data?.map((category) => [category.id, category.name]) ?? [],
      ),
    [categoriesQuery.data],
  );
  const isRefreshing = expensesQuery.isFetching && !expensesQuery.isLoading;
  const firstRiskyExpenseId = useMemo(() => {
    const expenses = expensesQuery.data ?? [];

    return (
      expenses.find((expense) => expense.evidenceStatus === "none") ??
      expenses.find((expense) => expense.status === "needs_review") ??
      expenses[0]
    )?.id;
  }, [expensesQuery.data]);
  const effectiveSelectedExpenseId =
    selectedExpenseId === undefined ? firstRiskyExpenseId : selectedExpenseId;
  const selectedExpense =
    expensesQuery.data?.find(
      (expense) => expense.id === effectiveSelectedExpenseId,
    ) ?? null;
  const latestCompletedExport =
    exportJobsQuery.data?.find((exportJob) => exportJob.status === "completed") ??
    null;

  const closeProject = async () => {
    await closeProjectMutation.mutateAsync();
    setConfirmCloseOpen(false);
  };

  const requestExport = async () => {
    await requestExportMutation.mutateAsync();
    setConfirmExportOpen(false);
  };

  return (
    <>
      <section className="bf-page-stack">
        <PageHeader
          actions={
            <>
              <Button
                disabled={expensesQuery.isFetching}
                onClick={() => void expensesQuery.refetch()}
                variant="outline"
              >
                {isRefreshing ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                수동 새로고침
              </Button>
              <LastUpdatedLabel
                dataUpdatedAt={expensesQuery.dataUpdatedAt}
                isRefreshing={isRefreshing}
              />
            </>
          }
          eyebrow="Expenses"
          lead="Slack 입력은 5초 간격으로 반영됩니다. 검토 사유 확인 후 승인 또는 반려합니다."
          title="지출 목록과 관리자 검토"
        />

        <div className="bf-card-grid" aria-label="지출 요약">
          <SummaryCard
            label="전체 지출"
            note="Slack 접수 기준 누적 건수"
            status={`${summaryQuery.data?.totalExpenseCount ?? 0}건`}
            value={formatCurrency(totalExpenseAmount(expensesQuery.data ?? []))}
          />
          <SummaryCard
            label="승인 금액"
            note="엑셀 생성 대상에 포함"
            status={`${summaryQuery.data?.approvedCount ?? 0}건`}
            tone="success"
            value={formatCurrency(summaryQuery.data?.approvedAmount ?? 0)}
          />
          <SummaryCard
            label="검토 필요"
            note="신뢰도 낮음, 증빙 없음, 예산 초과 가능"
            status={`${summaryQuery.data?.needsReviewCount ?? 0}건`}
            tone="warning"
            value={`${summaryQuery.data?.needsReviewCount ?? 0}`}
          />
          <SummaryCard
            label="증빙 누락"
            note="영수증 없음은 무조건 관리자 검토"
            status={`${summaryQuery.data?.missingEvidenceCount ?? 0}건`}
            tone="danger"
            value={`${summaryQuery.data?.missingEvidenceCount ?? 0}`}
          />
        </div>

        <PriorityStrip aria-label="검토 작업 순서">
          <PriorityStep status="1순위" title="증빙 없는 지출 먼저 확인" tone="missing">
            영수증 없음은 자동 승인하지 않고, 보완 요청 또는 반려를 먼저 결정합니다.
          </PriorityStep>
          <PriorityStep status="2순위" title="금액 차이와 예산 초과 가능성 확인" tone="review">
            AI 신뢰도와 검토 사유를 같은 패널에서 보고 필요한 필드만 수정합니다.
          </PriorityStep>
          <PriorityStep status="3순위" title="승인 항목만 엑셀 생성" tone="approved">
            남은 검토 항목은 제외된다는 경고를 확인하고 제출용 파일을 만듭니다.
          </PriorityStep>
        </PriorityStrip>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-4">
            <Panel>
              <div className="border-b border-zinc-200 p-4">
                <SectionToolbar>
                  <div className="flex flex-wrap gap-2" aria-label="지출 상태 필터">
                    {expenseStatusFilterOptions.map((option) => (
                      <button
                        aria-pressed={status === option.value}
                        className={
                          status === option.value
                            ? "h-9 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm"
                            : "h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                        }
                        key={option.value}
                        onClick={() => setStatus(option.value)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </SectionToolbar>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">날짜</th>
                      <th className="px-4 py-3 font-semibold">사용처 / 내용</th>
                      <th className="px-4 py-3 font-semibold">상태</th>
                      <th className="px-4 py-3 font-semibold">카테고리</th>
                      <th className="px-4 py-3 text-right font-semibold">금액</th>
                      <th className="px-4 py-3 font-semibold">결제자</th>
                      <th className="px-4 py-3 font-semibold">증빙</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesQuery.isLoading ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-zinc-600" colSpan={7}>
                          지출 내역을 불러오는 중입니다.
                        </td>
                      </tr>
                    ) : null}

                    {expensesQuery.data?.map((expense) => (
                      <ExpenseTableRow
                        categoryName={categoryNameById.get(expense.categoryId) ?? "미분류"}
                        expense={expense}
                        isSelected={expense.id === effectiveSelectedExpenseId}
                        key={expense.id}
                        onSelect={() => setSelectedExpenseId(expense.id)}
                      />
                    ))}

                    {expensesQuery.data?.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-zinc-600" colSpan={7}>
                          선택한 상태의 지출 내역이 없습니다.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-zinc-100 md:hidden">
                {expensesQuery.data?.map((expense) => (
                  <ExpenseMobileCard
                    categoryName={categoryNameById.get(expense.categoryId) ?? "미분류"}
                    expense={expense}
                    isSelected={expense.id === effectiveSelectedExpenseId}
                    key={expense.id}
                    onSelect={() => setSelectedExpenseId(expense.id)}
                  />
                ))}
              </div>
            </Panel>

            <ExportControls
              exportJob={latestCompletedExport}
              isClosing={closeProjectMutation.isPending}
              isExporting={requestExportMutation.isPending}
              needsReviewCount={summaryQuery.data?.needsReviewCount ?? 0}
              onCloseClick={() => setConfirmCloseOpen(true)}
              onExportClick={() => {
                if ((summaryQuery.data?.needsReviewCount ?? 0) > 0) {
                  setConfirmExportOpen(true);
                  return;
                }

                void requestExport();
              }}
              project={projectQuery.data ?? null}
            />
          </div>

          <ReviewPanel
            categories={categoriesQuery.data ?? []}
            expense={selectedExpense}
            onClose={() => setSelectedExpenseId(null)}
          />
        </section>
      </section>

      {confirmCloseOpen ? (
        <ConfirmModal
          confirmLabel="정산 마감"
          description="마감 후에는 Slack 입력이 차단된 상태로 표시됩니다. 늦은 증빙이 있다면 먼저 검토하세요."
          isPending={closeProjectMutation.isPending}
          onCancel={() => setConfirmCloseOpen(false)}
          onConfirm={() => void closeProject()}
          title="정산을 마감할까요?"
        />
      ) : null}

      {confirmExportOpen ? (
        <ConfirmModal
          confirmLabel="엑셀 생성"
          description={`검토 필요 항목 ${
            summaryQuery.data?.needsReviewCount ?? 0
          }건은 제외됩니다. 승인 완료 항목만 포함해 지출내역서를 생성합니다.`}
          isPending={requestExportMutation.isPending}
          onCancel={() => setConfirmExportOpen(false)}
          onConfirm={() => void requestExport()}
          title="검토 필요 항목을 제외하고 생성할까요?"
        />
      ) : null}
    </>
  );
}

function totalExpenseAmount(expenses: Expense[]) {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

function ExpenseTableRow({
  categoryName,
  expense,
  isSelected,
  onSelect,
}: {
  categoryName: string;
  expense: Expense;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const rowTone =
    expense.evidenceStatus === "none"
      ? "bg-red-50/70 hover:bg-red-100/70"
      : expense.status === "needs_review"
        ? "bg-amber-50/70 hover:bg-amber-100/70"
        : "hover:bg-zinc-50";

  return (
    <tr
      className={
        isSelected
          ? "cursor-pointer border-b border-zinc-200 bg-zinc-950/[0.04] ring-1 ring-inset ring-zinc-900/10"
          : `cursor-pointer border-b border-zinc-100 transition-colors ${rowTone}`
      }
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <td className="whitespace-nowrap px-4 py-3">{formatDate(expense.date)}</td>
      <td className="max-w-[300px] px-4 py-3">
        <div className="font-semibold text-zinc-950">{expense.merchant}</div>
        <p className="mt-1 truncate text-zinc-600">{expense.description}</p>
        {expense.reviewReason ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-700">
            <AlertTriangle className="size-3" />
            {expense.reviewReason}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <StatusBadge tone={statusToneByExpenseStatus[expense.status]}>
          {expenseStatusLabel[expense.status]}
        </StatusBadge>
      </td>
      <td className="px-4 py-3">{categoryName}</td>
      <td className="px-4 py-3 text-right font-bold tabular-nums">
        {formatCurrency(expense.amount)}
      </td>
      <td className="px-4 py-3">{expense.payerName}</td>
      <td className="px-4 py-3">
        <StatusBadge tone={evidenceToneByStatus[expense.evidenceStatus]}>
          {expense.evidenceStatus === "none" ? <FileWarning className="mr-1 size-3" /> : null}
          {evidenceStatusLabel[expense.evidenceStatus]}
        </StatusBadge>
      </td>
    </tr>
  );
}

function ExportControls({
  exportJob,
  isClosing,
  isExporting,
  needsReviewCount,
  onCloseClick,
  onExportClick,
  project,
}: {
  exportJob: ExportJob | null;
  isClosing: boolean;
  isExporting: boolean;
  needsReviewCount: number;
  onCloseClick: () => void;
  onExportClick: () => void;
  project: Project | null;
}) {
  return (
    <Panel className="bf-panel-pad">
      <SectionToolbar
        actions={
          <>
            <Button
              disabled={isClosing || project?.status === "closed"}
              onClick={onCloseClick}
              variant="outline"
            >
              {isClosing ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Lock data-icon="inline-start" />
              )}
              정산 마감
            </Button>
            <Button disabled={isExporting} onClick={onExportClick}>
              {isExporting ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Download data-icon="inline-start" />
              )}
              승인 항목만 엑셀 생성
            </Button>
          </>
        }
      >
        <h2 className="text-lg font-bold text-zinc-950">정산 마감 및 엑셀 생성</h2>
        <p className="bf-helper mt-1">
          검토 필요 항목이 남아 있어도 파일 생성은 가능하지만, 해당 항목은
          제외됩니다.
        </p>
      </SectionToolbar>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <strong className="text-sm font-bold text-zinc-950">생성 전 경고</strong>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                검토 필요 {needsReviewCount}건은 생성 파일에서 제외됨
              </p>
            </div>
            <StatusBadge tone={needsReviewCount > 0 ? "review" : "approved"}>
              {needsReviewCount > 0 ? "제외 있음" : "준비 완료"}
            </StatusBadge>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <strong className="text-sm font-bold text-zinc-950">최근 생성 파일</strong>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {exportJob
                  ? `포함 ${exportJob.includedExpenseCount}건 · 제외 ${exportJob.excludedReviewCount}건`
                  : "아직 현재 작업에서 생성된 파일 없음"}
              </p>
            </div>
            {exportJob?.downloadUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={exportJob.downloadUrl} rel="noreferrer" target="_blank">
                  다운로드
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ConfirmModal({
  confirmLabel,
  description,
  isPending,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel: string;
  description: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-[10px] border border-zinc-200 bg-white p-5 shadow-lg sm:rounded-[10px]">
        <h2 className="text-lg font-bold text-zinc-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={isPending} onClick={onCancel} variant="outline">
            취소
          </Button>
          <Button disabled={isPending} onClick={onConfirm}>
            {isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({
  categories,
  expense,
  onClose,
}: {
  categories: Array<{ id: string; name: string }>;
  expense: Expense | null;
  onClose: () => void;
}) {
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
      : {
          amount: 0,
          categoryId: "",
          date: "",
          description: "",
          expenseId: "",
        },
  });

  const isMutating = approveExpense.isPending || rejectExpense.isPending;

  if (!expense) {
    return (
      <Panel className="bf-panel-pad text-sm text-zinc-600 xl:sticky xl:top-20 xl:h-fit">
        검토할 지출 항목을 선택하세요.
      </Panel>
    );
  }

  const onApprove = form.handleSubmit(async (values) => {
    await approveExpense.mutateAsync(values);
    onClose();
  });

  const onReject = async () => {
    const reason =
      window.prompt("반려 사유를 입력하세요.", expense.reviewReason ?? "") ??
      undefined;

    await rejectExpense.mutateAsync({
      expenseId: expense.id,
      reason,
    });
    onClose();
  };

  return (
    <Panel className="xl:sticky xl:top-20 xl:h-fit">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            Review
          </p>
          <h2 className="mt-1 text-lg font-bold text-zinc-950">{expense.merchant}</h2>
        </div>
        <Button aria-label="검토 패널 닫기" onClick={onClose} size="icon" variant="ghost">
          <X />
        </Button>
      </div>

      <form className="space-y-4 p-5" onSubmit={onApprove}>
        <input type="hidden" {...form.register("expenseId")} />

        <FormField label="날짜" error={form.formState.errors.date?.message}>
          <TextInput type="date" {...form.register("date")} />
        </FormField>

        <FormField label="금액" error={form.formState.errors.amount?.message}>
          <TextInput inputMode="numeric" type="number" {...form.register("amount")} />
        </FormField>

        <FormField label="카테고리" error={form.formState.errors.categoryId?.message}>
          <SelectInput {...form.register("categoryId")}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="설명" error={form.formState.errors.description?.message}>
          <TextArea {...form.register("description")} />
        </FormField>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-600">AI 신뢰도</span>
            <span className="font-bold">{Math.round(expense.aiConfidence * 100)}%</span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span className="text-zinc-600">검토 사유</span>
            <span className="text-right font-bold text-zinc-950">
              {expense.reviewReason ?? "없음"}
            </span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span className="text-zinc-600">증빙</span>
            <StatusBadge tone={evidenceToneByStatus[expense.evidenceStatus]}>
              {evidenceStatusLabel[expense.evidenceStatus]}
            </StatusBadge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button disabled={isMutating} type="submit">
            {approveExpense.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            승인
          </Button>
          <Button
            disabled={isMutating}
            onClick={() => void onReject()}
            type="button"
            variant="destructive"
          >
            {rejectExpense.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <CircleX data-icon="inline-start" />
            )}
            반려
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function LastUpdatedLabel({
  dataUpdatedAt,
  isRefreshing,
}: {
  dataUpdatedAt: number;
  isRefreshing: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const updatedLabel = dataUpdatedAt
    ? formatRelativeSeconds(now - dataUpdatedAt)
    : "아직 갱신 전";

  return (
    <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600">
      {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <span className="bf-pulse" />}
      마지막 갱신: {updatedLabel}
    </span>
  );
}

function ExpenseMobileCard({
  categoryName,
  expense,
  isSelected,
  onSelect,
}: {
  categoryName: string;
  expense: Expense;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={
        isSelected
          ? "block w-full bg-zinc-950/[0.04] p-4 text-left"
          : expense.evidenceStatus === "none"
            ? "block w-full bg-red-50/70 p-4 text-left"
            : expense.status === "needs_review"
              ? "block w-full bg-amber-50/70 p-4 text-left"
              : "block w-full bg-white p-4 text-left"
      }
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{formatDate(expense.date)}</p>
          <h3 className="mt-1 truncate text-base font-bold text-zinc-950">
            {expense.merchant}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">
            {expense.description}
          </p>
        </div>
        <p className="shrink-0 text-right text-base font-bold tabular-nums">
          {formatCurrency(expense.amount)}
        </p>
      </div>
      {expense.reviewReason ? (
        <div className="mt-3 inline-flex max-w-full items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
          <AlertTriangle className="size-3 shrink-0" />
          <span className="truncate">{expense.reviewReason}</span>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge>{categoryName}</StatusBadge>
        <StatusBadge>{expense.payerName}</StatusBadge>
        <StatusBadge tone={statusToneByExpenseStatus[expense.status]}>
          {expenseStatusLabel[expense.status]}
        </StatusBadge>
        <StatusBadge tone={evidenceToneByStatus[expense.evidenceStatus]}>
          {evidenceStatusLabel[expense.evidenceStatus]}
        </StatusBadge>
      </div>
    </button>
  );
}
