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
  ReceiptText,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { SelectInput, TextArea, TextInput } from "@/components/form-controls";
import { FormField } from "@/components/form-field";
import { SummaryCard } from "@/components/summary-card";
import { Button } from "@/components/ui/button";
import { DEMO_PROJECT_ID } from "@/lib/config/demo";
import type { Expense, ExpenseStatus, ExportJob, Project } from "@/lib/domain";
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
  expenseStatusBadgeClass,
  expenseStatusFilterOptions,
  expenseStatusLabel,
} from "@/lib/status";

export function ExpensesClient() {
  const [status, setStatus] = useState<ExpenseStatus | "all">("all");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const projectQuery = useProject(DEMO_PROJECT_ID);
  const expensesQuery = useExpenses(DEMO_PROJECT_ID, status);
  const summaryQuery = useExpenseSummary(DEMO_PROJECT_ID);
  const categoriesQuery = useBudgetCategories(DEMO_PROJECT_ID);
  const exportJobsQuery = useExportJobs(DEMO_PROJECT_ID);
  const closeProjectMutation = useCloseProject(DEMO_PROJECT_ID);
  const requestExportMutation = useRequestExpenseReportExport(DEMO_PROJECT_ID);

  const categoryNameById = useMemo(() => {
    return new Map(
      categoriesQuery.data?.map((category) => [category.id, category.name]) ?? [],
    );
  }, [categoriesQuery.data]);

  const isRefreshing = expensesQuery.isFetching && !expensesQuery.isLoading;
  const selectedExpense =
    expensesQuery.data?.find((expense) => expense.id === selectedExpenseId) ??
    null;
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
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">지출 목록</h1>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {projectQuery.data?.name ?? "프로젝트"}의 슬랙 입력 분석 결과를
              확인합니다.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void expensesQuery.refetch()}
            disabled={expensesQuery.isFetching}
          >
            {isRefreshing ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            새로고침
          </Button>
        </div>

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

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard
            label="전체 지출"
            value={`${summaryQuery.data?.totalExpenseCount ?? 0}건`}
            tone="default"
          />
          <SummaryCard
            label="승인 금액"
            value={formatCurrency(summaryQuery.data?.approvedAmount ?? 0)}
            tone="success"
          />
          <SummaryCard
            label="검토 필요"
            value={`${summaryQuery.data?.needsReviewCount ?? 0}건`}
            tone="warning"
          />
          <SummaryCard
            label="증빙 누락"
            value={`${summaryQuery.data?.missingEvidenceCount ?? 0}건`}
            tone="danger"
          />
        </div>

        <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {expenseStatusFilterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={
                    status === option.value
                      ? "h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm"
                      : "h-9 rounded-lg border px-3 text-sm font-semibold text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-muted hover:text-foreground"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>

            <LastUpdatedLabel
              dataUpdatedAt={expensesQuery.dataUpdatedAt}
              isRefreshing={isRefreshing}
            />
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">날짜</th>
                  <th className="px-4 py-3 font-medium">사용처</th>
                  <th className="px-4 py-3 font-medium">내용 및 상태</th>
                  <th className="px-4 py-3 font-medium">카테고리</th>
                  <th className="px-4 py-3 text-right font-medium">금액</th>
                  <th className="px-4 py-3 font-medium">결제자</th>
                </tr>
              </thead>
              <tbody>
                {expensesQuery.isLoading ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      지출 내역을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : null}

                {expensesQuery.data?.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => setSelectedExpenseId(expense.id)}
                    className={
                      expense.id === selectedExpenseId
                        ? "cursor-pointer border-b bg-primary/5"
                        : expense.status === "needs_review"
                          ? "cursor-pointer border-b bg-red-50/60 hover:bg-red-50"
                          : "cursor-pointer border-b hover:bg-muted/50"
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3 font-medium">{expense.merchant}</td>
                    <td className="max-w-[260px] px-4 py-3">
                      <div className="truncate">{expense.description}</div>
                      {expense.reviewReason ? (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-red-700">
                          <AlertTriangle className="size-3" />
                          {expense.reviewReason}
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-medium ${
                            expenseStatusBadgeClass[expense.status]
                          }`}
                        >
                          {expenseStatusLabel[expense.status]}
                        </span>
                        <span
                          className={
                            expense.evidenceStatus === "none"
                              ? "inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                              : "inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700"
                          }
                        >
                          {expense.evidenceStatus === "none" ? (
                            <FileWarning className="size-3" />
                          ) : null}
                          {evidenceStatusLabel[expense.evidenceStatus]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {categoryNameById.get(expense.categoryId) ?? "미분류"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3">{expense.payerName}</td>
                  </tr>
                ))}

                {expensesQuery.data?.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      선택한 상태의 지출 내역이 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">
            {expensesQuery.isLoading ? (
              <div className="p-5 text-sm text-zinc-600">
                지출 내역을 불러오는 중입니다.
              </div>
            ) : null}

            {expensesQuery.data?.map((expense) => (
              <ExpenseMobileCard
                categoryName={categoryNameById.get(expense.categoryId) ?? "미분류"}
                expense={expense}
                isSelected={expense.id === selectedExpenseId}
                key={expense.id}
                onSelect={() => setSelectedExpenseId(expense.id)}
              />
            ))}

            {expensesQuery.data?.length === 0 ? (
              <div className="p-5 text-sm text-zinc-600">
                선택한 상태의 지출 내역이 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ReviewPanel
        categories={categoriesQuery.data ?? []}
        expense={selectedExpense}
        onClose={() => setSelectedExpenseId(null)}
      />
      </section>

      {confirmCloseOpen ? (
        <ConfirmModal
          confirmLabel="정산 마감"
          description="마감 후에는 슬랙 입력이 차단된 상태로 표시됩니다. 늦은 증빙이 있다면 먼저 검토하세요."
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
          }건은 제외됩니다. approved 항목만 포함해 지출내역서를 생성합니다.`}
          isPending={requestExportMutation.isPending}
          onCancel={() => setConfirmExportOpen(false)}
          onConfirm={() => void requestExport()}
          title="검토 필요 항목을 제외하고 생성할까요?"
        />
      ) : null}
    </>
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
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">정산 마감 및 엑셀 다운로드</h2>
            <span
              className={
                project?.status === "closed"
                  ? "rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700"
                  : "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
              }
            >
              {project?.status === "closed" ? "마감됨" : "진행 중"}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            엑셀 생성 시 검토 필요 항목은 제외되고 승인 완료 항목만 포함됩니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            variant="outline"
            onClick={onCloseClick}
            disabled={isClosing || project?.status === "closed"}
          >
            {isClosing ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Lock data-icon="inline-start" />
            )}
            정산 마감
          </Button>
          <Button onClick={onExportClick} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Download data-icon="inline-start" />
            )}
            엑셀 생성
          </Button>
        </div>
      </div>

      {needsReviewCount > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          검토 필요 항목 {needsReviewCount}건은 생성 파일에서 제외됩니다.
        </div>
      ) : null}

      {exportJob ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-muted p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">최근 생성 파일</p>
            <p className="text-zinc-600">
              포함 {exportJob.includedExpenseCount}건 · 제외{" "}
              {exportJob.excludedReviewCount}건 · 만료{" "}
              {exportJob.expiresAt ? formatDate(exportJob.expiresAt) : "-"}
            </p>
          </div>
          {exportJob.downloadUrl ? (
            <Button asChild variant="outline">
              <a href={exportJob.downloadUrl} rel="noreferrer" target="_blank">
                <Download data-icon="inline-start" />
                다운로드
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
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
      <div className="w-full max-w-md rounded-t-2xl border bg-background p-5 shadow-lg sm:rounded-xl">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm leading-6 text-zinc-600">{description}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            취소
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
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
          expenseId: expense.id,
          date: expense.date,
          amount: expense.amount,
          categoryId: expense.categoryId,
          description: expense.description,
        }
      : {
          expenseId: "",
          date: "",
          amount: 0,
          categoryId: "",
          description: "",
        },
  });

  const isMutating = approveExpense.isPending || rejectExpense.isPending;

  if (!expense) {
    return (
      <aside className="rounded-xl border border-dashed bg-background p-5 text-sm text-zinc-600 xl:sticky xl:top-20 xl:h-fit">
        검토할 지출 항목을 선택하세요.
      </aside>
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
    <aside className="rounded-xl border bg-background shadow-sm xl:sticky xl:top-20 xl:h-fit">
      <div className="flex items-start justify-between gap-3 border-b p-5">
        <div>
          <p className="text-sm font-medium text-zinc-600">검토 항목</p>
          <h2 className="mt-1 text-lg font-semibold">{expense.merchant}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X />
        </Button>
      </div>

      <form onSubmit={onApprove} className="space-y-4 p-5">
        <input type="hidden" {...form.register("expenseId")} />

        <FormField label="날짜" error={form.formState.errors.date?.message}>
          <TextInput
            type="date"
            {...form.register("date")}
          />
        </FormField>

        <FormField label="금액" error={form.formState.errors.amount?.message}>
          <TextInput
            inputMode="numeric"
            type="number"
            {...form.register("amount")}
          />
        </FormField>

        <FormField label="카테고리" error={form.formState.errors.categoryId?.message}>
          <SelectInput
            {...form.register("categoryId")}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="설명" error={form.formState.errors.description?.message}>
          <TextArea
            {...form.register("description")}
          />
        </FormField>

        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-600">AI 신뢰도</span>
            <span className="font-medium">{Math.round(expense.aiConfidence * 100)}%</span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span className="text-zinc-600">검토 사유</span>
            <span className="text-right font-medium">
              {expense.reviewReason ?? "없음"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="submit" disabled={isMutating}>
            {approveExpense.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            승인
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onReject()}
            disabled={isMutating}
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
    </aside>
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
    <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600">
      {isRefreshing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ReceiptText className="size-4" />
      )}
      마지막 갱신: {updatedLabel}
    </div>
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
      type="button"
      onClick={onSelect}
      className={
        isSelected
          ? "block w-full bg-primary/5 p-4 text-left"
          : expense.status === "needs_review"
            ? "block w-full bg-red-50/60 p-4 text-left transition-colors hover:bg-red-50"
            : "block w-full bg-background p-4 text-left transition-colors hover:bg-muted/50"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{formatDate(expense.date)}</p>
          <h3 className="mt-1 truncate text-base font-semibold">
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
        <span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
          {categoryName}
        </span>
        <span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
          {expense.payerName}
        </span>
        <span
          className={`rounded-lg px-2 py-1 text-xs font-semibold ${expenseStatusBadgeClass[expense.status]}`}
        >
          {expenseStatusLabel[expense.status]}
        </span>
        <span
          className={
            expense.evidenceStatus === "none"
              ? "inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100"
              : "inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200"
          }
        >
          {expense.evidenceStatus === "none" ? (
            <FileWarning className="size-3" />
          ) : null}
          {evidenceStatusLabel[expense.evidenceStatus]}
        </span>
      </div>
    </button>
  );
}
