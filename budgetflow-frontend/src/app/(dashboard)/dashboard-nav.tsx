"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, ReceiptText, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/projects", label: "프로젝트", icon: FolderKanban },
  { href: "/expenses", label: "지출", icon: ReceiptText },
  { href: "/settings", label: "설정", icon: Settings },
];

type DashboardNavProps = {
  placement?: "desktop" | "mobile";
};

export function DashboardNav({ placement = "desktop" }: DashboardNavProps) {
  const pathname = usePathname();
  const isMobile = placement === "mobile";

  return (
    <nav
      aria-label={isMobile ? "모바일 주요 화면" : "주요 화면"}
      className={cn(isMobile ? "grid grid-cols-3 gap-1" : "hidden items-center gap-1 md:flex")}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              isMobile
                ? "min-h-14 flex-col px-2 text-[0.72rem]"
                : "h-10 px-3 text-sm",
              isActive
                ? "bg-zinc-950 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon className={cn(isMobile ? "size-[1.125rem]" : "size-4")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
