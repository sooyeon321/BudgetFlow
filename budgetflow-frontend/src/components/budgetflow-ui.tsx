import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusTone =
  | "default"
  | "approved"
  | "review"
  | "missing"
  | "processing"
  | "rejected"
  | "exported";

const statusToneClass: Record<StatusTone, string> = {
  default: "border-zinc-200 bg-zinc-50 text-zinc-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  review: "border-amber-200 bg-amber-50 text-amber-800",
  missing: "border-red-200 bg-red-50 text-red-700",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  rejected: "border-zinc-300 bg-zinc-100 text-zinc-700",
  exported: "border-violet-200 bg-violet-50 text-violet-700",
};

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      href="/projects"
      className={cn(
        "inline-flex items-center gap-2 text-sm font-bold tracking-tight text-zinc-950",
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-zinc-950 text-xs font-bold text-white shadow-sm">
        BF
      </span>
      <span>BudgetFlow</span>
    </Link>
  );
}

export function StatusBadge({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: StatusTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight",
        statusToneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"section">, "children">) {
  return (
    <section
      className={cn("rounded-[10px] border border-zinc-200 bg-white shadow-sm", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  actions,
  eyebrow,
  lead,
  title,
}: {
  actions?: ReactNode;
  eyebrow: string;
  lead?: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 w-full max-w-xs sm:max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
          {eyebrow}
        </p>
        <h1 className="mt-2 break-keep text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          {title}
        </h1>
        {lead ? (
          <p className="mt-2 break-all text-sm leading-6 text-zinc-600 sm:text-[0.95rem]">
            {lead}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full min-w-0 flex-wrap gap-2 lg:w-auto lg:shrink-0">{actions}</div> : null}
    </div>
  );
}

export function PriorityStrip({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"section">, "children">) {
  return (
    <section
      className={cn(
        "grid gap-3 rounded-[10px] border border-zinc-200 bg-white p-3 shadow-sm md:grid-cols-3",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function PriorityStep({
  children,
  className,
  status,
  title,
  tone,
}: {
  children: ReactNode;
  className?: string;
  status: string;
  title: string;
  tone: StatusTone;
}) {
  return (
    <article
      className={cn(
        "rounded-lg border border-zinc-200 bg-zinc-50/60 p-3",
        tone === "missing" || tone === "review" ? "border-amber-200 bg-amber-50/70" : null,
        className,
      )}
    >
      <StatusBadge tone={tone}>{status}</StatusBadge>
      <strong className="mt-2 block text-sm font-bold text-zinc-950">{title}</strong>
      <p className="mt-1 text-sm leading-6 text-zinc-600">{children}</p>
    </article>
  );
}

export function SectionToolbar({
  actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>{children}</div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function ProgressBar({
  tone = "approved",
  value,
}: {
  tone?: Extract<StatusTone, "approved" | "review" | "processing" | "missing">;
  value: number;
}) {
  const width = Math.min(100, Math.max(0, value));
  const toneClass = {
    approved: "bg-emerald-500",
    review: "bg-amber-500",
    processing: "bg-blue-500",
    missing: "bg-red-500",
  }[tone];

  return (
    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
      <div className={cn("h-full rounded-full", toneClass)} style={{ width: `${width}%` }} />
    </div>
  );
}
