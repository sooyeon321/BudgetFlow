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

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="주요 메뉴">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            className={cn(
              "inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-w-auto",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="sr-only sm:not-sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
