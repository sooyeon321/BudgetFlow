"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { TextInput } from "@/components/form-controls";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { getCognitoConfig, signIn } from "@/lib/auth/auth-api";
import { loginSchema, type LoginInput, type LoginValues } from "@/lib/forms/login";

const sessionStorageKey = "budgetflow.session";
const defaultValues: LoginInput = {
  email: "admin@budgetflow.dev",
  password: "budgetflow",
};

export function LoginClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const cognitoConfig = getCognitoConfig();
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
    <main className="flex min-h-dvh items-center justify-center bg-muted px-6 py-10">
      <section className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-semibold text-zinc-600">
            BudgetFlow
          </p>
          <h1 className="text-2xl font-bold tracking-tight">관리자 로그인</h1>
          <p className="text-sm leading-6 text-zinc-600">
            AWS Cognito 설정 전에는 Mock 관리자 계정으로 진입합니다.
          </p>
        </div>

        <div
          className={
            cognitoConfig.isConfigured
              ? "mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          }
        >
          <div className="flex items-center gap-2 font-medium">
            {cognitoConfig.isConfigured ? (
              <ShieldCheck className="size-4" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {cognitoConfig.isConfigured ? "Cognito 설정 감지" : "Mock 인증 모드"}
          </div>
          <p className="mt-1">
            {cognitoConfig.isConfigured
              ? `${cognitoConfig.region} / ${cognitoConfig.userPoolId}`
              : "백엔드에서 User Pool ID와 App Client ID를 받으면 환경변수로 교체합니다."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="이메일" error={form.formState.errors.email?.message}>
            <TextInput
              autoComplete="email"
              type="email"
              {...form.register("email")}
            />
          </FormField>

          <FormField
            label="비밀번호"
            error={form.formState.errors.password?.message}
          >
            <TextInput
              autoComplete="current-password"
              type="password"
              {...form.register("password")}
            />
          </FormField>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            className="w-full"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <LogIn data-icon="inline-start" />
            )}
            로그인
          </Button>
        </form>
      </section>
    </main>
  );
}
