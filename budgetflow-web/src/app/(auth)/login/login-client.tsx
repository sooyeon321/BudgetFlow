"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { BrandLink, Panel } from "@/components/budgetflow-ui";
import { TextInput } from "@/components/form-controls";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/auth-api";
import { loginSchema, type LoginInput, type LoginValues } from "@/lib/forms/login";

const sessionStorageKey = "budgetflow.session";
const defaultValues: LoginInput = {
  email: "admin@budgetflow.dev",
  password: "budgetflow",
};

const servicePoints = [
  ["메신저 입력", "프로젝트별 Slack 채널에서 지출 설명과 자료를 수집합니다."],
  ["AI 분류", "금액, 사용처, 카테고리, 위험 신호를 자동으로 정리합니다."],
  ["관리자 검토", "영수증 없음, 낮은 신뢰도, 예산 초과 가능성을 사람이 확인합니다."],
  ["엑셀 제출", "승인된 항목만 기관 제출용 지출내역서에 포함합니다."],
] as const;

export function LoginClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginInput, undefined, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    try {
      const session = await signIn(values);
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
      router.push("/projects");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다.");
    }
  });

  return (
    <main className="grid min-h-dvh bg-zinc-50 lg:grid-cols-[minmax(0,1fr)_460px]">
      <section
        aria-label="BudgetFlow 서비스 소개"
        className="hidden min-h-dvh border-r border-zinc-200 bg-white px-10 py-10 lg:flex"
      >
        <div className="flex max-w-3xl flex-col justify-between">
          <BrandLink />
          <div className="py-12">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
              Slack-first budget operations
            </p>
            <h1 className="mt-3 max-w-3xl break-keep text-4xl font-bold leading-tight tracking-tight text-zinc-950">
              Slack 지출 메시지를 검토 가능한 정산 업무로 바꿉니다.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
              팀원은 Slack에 지출 설명과 증빙을 남기고, 회계 담당자는
              BudgetFlow에서 분류 결과를 확인해 승인한 뒤 제출용 엑셀 파일을
              생성합니다.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {servicePoints.map(([title, description]) => (
                <article
                  className="rounded-[10px] border border-zinc-200 bg-zinc-50 p-4"
                  key={title}
                >
                  <strong className="text-sm font-bold text-zinc-950">
                    {title}
                  </strong>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <div />
        </div>
      </section>

      <section aria-label="로그인" className="flex min-h-dvh items-center justify-center px-5 py-8">
        <Panel className="w-full max-w-sm p-5 sm:p-6">
          <BrandLink className="mb-7 lg:hidden" />
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
              Sign in
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
              로그인
            </h2>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <FormField label="이메일" error={form.formState.errors.email?.message}>
              <TextInput autoComplete="email" type="email" {...form.register("email")} />
            </FormField>

            <FormField
              label="비밀번호"
              error={form.formState.errors.password?.message}
            >
              <div className="relative">
                <TextInput
                  autoComplete="current-password"
                  className="pr-12"
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")}
                />
                <button
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  className="absolute right-1 top-1 inline-grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </FormField>

            {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

            <Button
              className="h-12 w-full"
              disabled={form.formState.isSubmitting}
              type="submit"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <LogIn data-icon="inline-start" />
              )}
              로그인
            </Button>
          </form>
        </Panel>
      </section>
    </main>
  );
}
