import Link from "next/link";

import { BrandLink, StatusBadge } from "@/components/budgetflow-ui";
import { PageTransition } from "@/components/page-transition";

import { DashboardNav } from "./dashboard-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-zinc-50 max-sm:h-dvh max-sm:overflow-hidden md:block">
      <header className="sticky top-0 z-40 shrink-0 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <BrandLink />
          <DashboardNav />
          <div className="hidden items-center gap-2 md:flex">
            <StatusBadge>운영자</StatusBadge>
            <Link
              className="inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50"
              href="/login"
            >
              로그아웃
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto min-w-0 w-full max-w-7xl flex-1 overflow-x-hidden overflow-y-auto px-4 pb-6 pt-6 sm:px-6 md:overflow-visible md:py-8">
        <PageTransition>{children}</PageTransition>
      </main>

      <div className="z-40 shrink-0 border-t border-zinc-200 bg-white/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <DashboardNav placement="mobile" />
      </div>
    </div>
  );
}
