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
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-[#F7F9FA] max-sm:h-dvh max-sm:overflow-hidden md:block">
      <header className="sticky top-0 z-40 shrink-0 border-b border-[#E1E6EA] bg-white">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <BrandLink />
          <DashboardNav />
          <div className="hidden items-center gap-2 md:flex">
            <StatusBadge>운영자</StatusBadge>
            <Link
              className="inline-flex h-9 items-center rounded-lg border border-[#E1E6EA] bg-white px-3 text-sm font-semibold text-[#4D575F] shadow-sm hover:border-[#CBD3D9] hover:bg-[#F7F9FA]"
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

      <div className="z-40 shrink-0 border-t border-[#E1E6EA] bg-white px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(22,27,31,0.08)] md:hidden">
        <DashboardNav placement="mobile" />
      </div>
    </div>
  );
}
