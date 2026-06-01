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
  default: "border-[#E1E6EA] bg-[#EFF2F4] text-[#4D575F]",
  approved: "border-[#ADDDD3] bg-[#E6F4EC] text-[#11623D]",
  review: "border-[#EFC877] bg-[#FBF0DC] text-[#855210]",
  missing: "border-[#F8DEDB] bg-[#FBE9E7] text-[#8A2A24]",
  processing: "border-[#B8D3EC] bg-[#E7F0F9] text-[#1B466F]",
  rejected: "border-[#CBD3D9] bg-[#EFF2F4] text-[#4D575F]",
  exported: "border-[#ADDDD3] bg-[#EFF8F6] text-[#0F574C]",
};

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      href="/projects"
      className={cn(
        "inline-flex items-center gap-2 text-sm font-bold tracking-tight text-[#161B1F]",
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-[#126B5D] text-xs font-bold text-white shadow-sm">
        BF
      </span>
      <span>
        <b>Budget</b>
        <span className="text-[#126B5D]">Flow</span>
      </span>
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
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-tight",
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
      className={cn(
        "rounded-xl border border-[#E1E6EA] bg-white shadow-sm",
        className,
      )}
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
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9AA6AF]">
          {eyebrow}
        </p>
        <h1 className="mt-2 break-keep text-2xl font-bold tracking-tight text-[#161B1F] sm:text-3xl">
          {title}
        </h1>
        {lead ? (
          <p className="mt-2 break-all text-sm leading-6 text-[#4D575F] sm:text-[0.95rem]">
            {lead}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 flex-wrap gap-2 lg:w-auto lg:shrink-0">
          {actions}
        </div>
      ) : null}
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
        "grid gap-3 rounded-xl border border-[#E1E6EA] bg-white p-3 shadow-sm md:grid-cols-3",
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
  const bgClass =
    tone === "missing"
      ? "border-[#F8DEDB] bg-[#FBE9E7]/60"
      : tone === "review"
        ? "border-[#EFC877] bg-[#FBF0DC]/60"
        : "border-[#E1E6EA] bg-[#F7F9FA]";

  return (
    <article className={cn("rounded-lg border p-3", bgClass, className)}>
      <StatusBadge tone={tone}>{status}</StatusBadge>
      <strong className="mt-2 block text-sm font-bold text-[#161B1F]">
        {title}
      </strong>
      <p className="mt-1 text-sm leading-6 text-[#4D575F]">{children}</p>
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
    approved: "bg-[#1E9E62]",
    review: "bg-[#C9821A]",
    processing: "bg-[#2D6FB3]",
    missing: "bg-[#C8443B]",
  }[tone];

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#EFF2F4]">
      <div
        className={cn("h-full rounded-full", toneClass)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
