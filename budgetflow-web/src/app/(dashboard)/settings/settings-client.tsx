"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Save, Tag, Upload } from "lucide-react";
import { useForm } from "react-hook-form";

import { TextArea, TextInput } from "@/components/form-controls";
import { FormField } from "@/components/form-field";
import { SummaryCard } from "@/components/summary-card";
import { Button } from "@/components/ui/button";
import { DEMO_PROJECT_ID } from "@/lib/config/demo";
import type {
  BudgetCategory,
  Project,
  TemplateUploadResult,
} from "@/lib/domain";
import {
  budgetCategoryFormSchema,
  parseKeywordsText,
  type BudgetCategoryFormInput,
  type BudgetCategoryFormValues,
} from "@/lib/forms/budget-category";
import { formatCurrency } from "@/lib/formatters";
import {
  useBudgetCategories,
  useConfirmTemplateMapping,
  useCreateBudgetCategory,
  useProject,
  useUploadProjectTemplate,
  useUpdateBudgetCategory,
} from "@/lib/hooks/use-budgetflow";

const defaultValues: BudgetCategoryFormInput = {
  name: "",
  budgetLimit: 100_000,
  keywordsText: "",
};

export function SettingsClient() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const projectQuery = useProject(DEMO_PROJECT_ID);
  const categoriesQuery = useBudgetCategories(DEMO_PROJECT_ID);
  const createCategory = useCreateBudgetCategory(DEMO_PROJECT_ID);
  const updateCategory = useUpdateBudgetCategory(DEMO_PROJECT_ID);
  const selectedCategory = useMemo(
    () =>
      categoriesQuery.data?.find(
        (category) => category.id === selectedCategoryId,
      ) ?? null,
    [categoriesQuery.data, selectedCategoryId],
  );
  const form = useForm<
    BudgetCategoryFormInput,
    undefined,
    BudgetCategoryFormValues
  >({
    resolver: zodResolver(budgetCategoryFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!selectedCategory) {
      form.reset(defaultValues);
      return;
    }

    form.reset({
      name: selectedCategory.name,
      budgetLimit: selectedCategory.budgetLimit,
      keywordsText: selectedCategory.keywords.join(", "),
    });
  }, [form, selectedCategory]);

  const isMutating = createCategory.isPending || updateCategory.isPending;
  const totals = useMemo(
    () =>
      categoriesQuery.data?.reduce(
        (accumulator, category) => ({
          approvedAmount: accumulator.approvedAmount + category.approvedAmount,
          budgetLimit: accumulator.budgetLimit + category.budgetLimit,
        }),
        { approvedAmount: 0, budgetLimit: 0 },
      ) ?? { approvedAmount: 0, budgetLimit: 0 },
    [categoriesQuery.data],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const keywords = parseKeywordsText(values.keywordsText);

    if (selectedCategory) {
      await updateCategory.mutateAsync({
        categoryId: selectedCategory.id,
        name: values.name,
        budgetLimit: values.budgetLimit,
        keywords,
      });
    } else {
      await createCategory.mutateAsync({
        projectId: DEMO_PROJECT_ID,
        name: values.name,
        budgetLimit: values.budgetLimit,
        keywords,
      });
    }

    setSelectedCategoryId(null);
    form.reset(defaultValues);
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">설정</h1>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            {projectQuery.data?.name ?? "프로젝트"}의 예산 카테고리와 분류
            기준을 관리합니다.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            document
              .getElementById("template-upload")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <Upload data-icon="inline-start" /> 양식 업로드
        </Button>
      </div>

      <TemplateUploadPanel project={projectQuery.data ?? null} />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="카테고리 예산" value={formatCurrency(totals.budgetLimit)} />
            <SummaryCard label="승인 사용액" value={formatCurrency(totals.approvedAmount)} />
          </div>

          <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold">예산 카테고리</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                한도와 키워드는 AI 분류 기준으로 백엔드에 전달됩니다.
              </p>
            </div>

            <div className="divide-y">
              {categoriesQuery.isLoading ? (
                <div className="p-5 text-sm text-zinc-600">
                  카테고리를 불러오는 중입니다.
                </div>
              ) : null}

              {categoriesQuery.data?.map((category) => (
                <CategoryRow
                  category={category}
                  isSelected={category.id === selectedCategoryId}
                  key={category.id}
                  onEdit={() => setSelectedCategoryId(category.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="h-fit rounded-xl border bg-background p-5 shadow-sm"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedCategory ? "카테고리 수정" : "카테고리 추가"}
              </h2>
              <p className="text-sm leading-6 text-zinc-600">
                쉼표로 분류 키워드를 입력합니다.
              </p>
            </div>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setSelectedCategoryId(null)}
            >
              <Plus data-icon="inline-start" />새 항목
            </Button>
          </div>

          <div className="space-y-4">
            <FormField label="카테고리명" error={form.formState.errors.name?.message}>
              <TextInput
                placeholder="다과비"
                {...form.register("name")}
              />
            </FormField>

            <FormField
              label="예산 한도"
              error={form.formState.errors.budgetLimit?.message}
            >
              <TextInput
                inputMode="numeric"
                step="10000"
                type="number"
                {...form.register("budgetLimit")}
              />
            </FormField>

            <FormField
              label="분류 키워드"
              error={form.formState.errors.keywordsText?.message}
            >
              <TextArea
                placeholder="간식, 커피, 음료"
                {...form.register("keywordsText")}
              />
            </FormField>
          </div>

          <Button className="mt-5 w-full" type="submit" disabled={isMutating}>
            {isMutating ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : selectedCategory ? (
              <Save data-icon="inline-start" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            {selectedCategory ? "수정 저장" : "추가"}
          </Button>
        </form>
      </div>
    </section>
  );
}

function TemplateUploadPanel({ project }: { project: Project | null }) {
  const [fileName, setFileName] = useState("");
  const [uploadResult, setUploadResult] = useState<TemplateUploadResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const uploadTemplate = useUploadProjectTemplate(DEMO_PROJECT_ID);
  const confirmMapping = useConfirmTemplateMapping(DEMO_PROJECT_ID);
  const isPending = uploadTemplate.isPending || confirmMapping.isPending;

  const onUpload = async () => {
    setError(null);

    if (!fileName) {
      setError("업로드할 엑셀 파일을 선택하세요.");
      return;
    }

    try {
      const result = await uploadTemplate.mutateAsync({
        projectId: DEMO_PROJECT_ID,
        fileName,
      });
      setUploadResult(result);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "양식 업로드에 실패했습니다.",
      );
    }
  };

  const onConfirmMapping = async () => {
    if (!uploadResult) {
      return;
    }

    const result = await confirmMapping.mutateAsync({
      projectId: DEMO_PROJECT_ID,
      mappings: uploadResult.mappings,
    });
    setUploadResult(result);
  };

  return (
    <section
      className="rounded-xl border bg-background p-5 shadow-sm"
      id="template-upload"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">엑셀 양식 업로드</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            MVP에서는 파일명을 Mock 저장하고, LLM 컬럼 매핑 추천 결과를
            placeholder로 표시합니다.
          </p>
          <p className="mt-2 text-sm text-zinc-700">
            현재 양식:{" "}
            <span className="font-medium">
              {project?.templateFileName ?? "미등록"}
            </span>
            <span className="ml-2 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
              {templateMappingStatusLabel(project?.templateMappingStatus)}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-80">
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background px-3 text-sm transition-colors hover:border-zinc-300 hover:bg-muted/40">
            <span className="truncate text-zinc-600">
              {fileName || "엑셀 파일을 선택하세요"}
            </span>
            <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-zinc-700">
              파일 선택
            </span>
            <input
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
              type="file"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button onClick={() => void onUpload()} disabled={isPending}>
            {uploadTemplate.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Upload data-icon="inline-start" />
            )}
            업로드 및 매핑 추천
          </Button>
        </div>
      </div>

      {uploadResult ? (
        <div className="mt-5 overflow-hidden rounded-xl border">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">컬럼 매핑 추천</h3>
              <p className="text-sm text-zinc-600">
                {uploadResult.fileName} · 상태{" "}
                {templateMappingStatusLabel(uploadResult.mappingStatus)}
              </p>
            </div>
            <Button
              onClick={() => void onConfirmMapping()}
              disabled={isPending || uploadResult.mappingStatus === "confirmed"}
            >
              {confirmMapping.isPending ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              매핑 확정
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/50 text-xs text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">엑셀 컬럼</th>
                  <th className="px-4 py-3 font-medium">BudgetFlow 필드</th>
                  <th className="px-4 py-3 font-medium">신뢰도</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {uploadResult.mappings.map((mapping) => (
                  <tr className="border-t" key={mapping.targetField}>
                    <td className="px-4 py-3 font-medium">
                      {mapping.sourceColumn}
                    </td>
                    <td className="px-4 py-3">
                      {templateFieldLabel[mapping.targetField]}
                    </td>
                    <td className="px-4 py-3">
                      {Math.round(mapping.confidence * 100)}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          mapping.confirmed
                            ? "rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
                            : "rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100"
                        }
                      >
                        {mapping.confirmed ? "확정" : "추천"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function templateMappingStatusLabel(
  status: Project["templateMappingStatus"] | TemplateUploadResult["mappingStatus"] | undefined,
) {
  if (status === "confirmed") {
    return "매핑 확정";
  }

  if (status === "suggested") {
    return "매핑 추천";
  }

  return "매핑 없음";
}

const templateFieldLabel = {
  date: "날짜",
  merchant: "사용처",
  description: "내용",
  category: "예산 항목",
  amount: "금액",
  payerName: "결제자",
  evidence: "증빙",
} as const;

function CategoryRow({
  category,
  isSelected,
  onEdit,
}: {
  category: BudgetCategory;
  isSelected: boolean;
  onEdit: () => void;
}) {
  const usageWidth = Math.min(100, Math.max(0, category.usageRate));
  const isOverBudget = category.remainingAmount < 0;

  return (
    <article className={isSelected ? "bg-primary/5 p-4" : "p-4"}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="size-4 text-zinc-500" />
            <h3 className="font-semibold">{category.name}</h3>
            {isOverBudget ? (
              <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                초과
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1">
            {category.keywords.map((keyword) => (
              <span
                className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200"
                key={keyword}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil data-icon="inline-start" />
          수정
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="font-medium text-zinc-600">
            {formatCurrency(category.approvedAmount)} /{" "}
            {formatCurrency(category.budgetLimit)}
          </span>
          <span className={isOverBudget ? "font-medium text-red-700" : "font-medium"}>
            잔액 {formatCurrency(category.remainingAmount)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={isOverBudget ? "h-full bg-red-500" : "h-full bg-emerald-500"}
            style={{ width: `${usageWidth}%` }}
          />
        </div>
      </div>
    </article>
  );
}
