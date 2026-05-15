"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  FolderPlus,
  Hash,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { TextInput } from "@/components/form-controls";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { useCreateProject, useProjects } from "@/lib/hooks/use-budgetflow";
import {
  createProjectSchema,
  type CreateProjectInput,
  type CreateProjectValues,
} from "@/lib/forms/project";
import { DEMO_ORGANIZATION_ID } from "@/lib/config/demo";
import { formatCurrency, formatDate } from "@/lib/formatters";

const defaultValues: CreateProjectInput = {
  organizationId: DEMO_ORGANIZATION_ID,
  name: "",
  totalBudget: 1_000_000,
  slackChannelName: "",
  templateFileName: "",
};

export function ProjectsClient() {
  const projectsQuery = useProjects();
  const createProjectMutation = useCreateProject();
  const form = useForm<CreateProjectInput, undefined, CreateProjectValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createProjectMutation.mutateAsync(values);
    form.reset(defaultValues);
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">프로젝트</h1>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            행사 단위 프로젝트를 생성하고 대시보드로 진입합니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm">
          <CircleCheck className="size-4 text-emerald-600" />
          Mock API 연결됨
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          {projectsQuery.isLoading ? (
            <div className="rounded-xl border bg-background p-6 text-sm text-zinc-600 shadow-sm">
              프로젝트를 불러오는 중입니다.
            </div>
          ) : null}

          {projectsQuery.data?.map((project) => (
            <article
              key={project.id}
              className="rounded-xl border bg-background p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-keep text-lg font-semibold">
                      {project.name}
                    </h2>
                    <span
                      className={
                        project.status === "active"
                          ? "rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
                          : "rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200"
                      }
                    >
                      {project.status === "active" ? "활성" : "마감"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-zinc-600">
                    <span>{formatCurrency(project.totalBudget)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Hash className="size-3.5" />
                      {project.slackChannelName}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    {project.templateFileName ?? "엑셀 양식 미등록"}
                  </p>
                </div>

                <Button asChild variant="outline">
                  <Link href="/expenses">
                    지출 보기
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className="h-fit rounded-xl border bg-background p-5 shadow-sm"
        >
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold">프로젝트 생성</h2>
            <p className="text-sm leading-6 text-zinc-600">
              AWS 연동 전까지 현재 조직의 Mock 프로젝트로 생성됩니다.
            </p>
          </div>

          <input type="hidden" {...form.register("organizationId")} />

          <div className="space-y-4">
            <FormField
              label="프로젝트명"
              error={form.formState.errors.name?.message}
            >
              <TextInput
                placeholder="AINGTHON 운영 예산"
                {...form.register("name")}
              />
            </FormField>

            <FormField
              label="총 예산"
              error={form.formState.errors.totalBudget?.message}
            >
              <TextInput
                inputMode="numeric"
                type="number"
                step="10000"
                {...form.register("totalBudget")}
              />
            </FormField>

            <FormField
              label="슬랙 채널"
              error={form.formState.errors.slackChannelName?.message}
            >
              <TextInput
                placeholder="#aingthon-budget"
                {...form.register("slackChannelName")}
              />
            </FormField>

            <FormField
              label="엑셀 양식 파일명"
              error={form.formState.errors.templateFileName?.message}
            >
              <TextInput
                placeholder="AINGTHON_지출내역서.xlsx"
                {...form.register("templateFileName")}
              />
            </FormField>
          </div>

          {createProjectMutation.isError ? (
            <p className="mt-4 text-sm text-destructive">
              프로젝트 생성에 실패했습니다.
            </p>
          ) : null}

          <Button
            className="mt-5 w-full"
            type="submit"
            disabled={createProjectMutation.isPending}
          >
            {createProjectMutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <FolderPlus data-icon="inline-start" />
            )}
            생성
          </Button>
        </form>
      </div>
    </section>
  );
}
