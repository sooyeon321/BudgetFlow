type SummaryTone = "default" | "success" | "warning" | "danger";

type SummaryCardProps = {
  label: string;
  note?: string;
  status?: string;
  value: string;
  tone?: SummaryTone;
};

const toneClass: Record<SummaryTone, string> = {
  default: "border-[var(--bf-border-subtle)]",
  success:
    "border-[var(--bf-support-success)] bg-[var(--bf-support-success-bg)]",
  warning:
    "border-[var(--bf-support-warning)] bg-[var(--bf-support-warning-bg)]",
  danger: "border-[var(--bf-support-error)] bg-[var(--bf-support-error-bg)]",
};

export function SummaryCard({
  label,
  note,
  status,
  value,
  tone = "default",
}: SummaryCardProps) {
  return (
    <div
      className={`rounded-lg border bg-[var(--bf-layer-01)] p-4 shadow-sm ${toneClass[tone]}`}
    >
      <div className="flex min-h-6 items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--bf-text-secondary)]">
          {label}
        </p>
        {status ? (
          <span className="rounded-full bg-[var(--bf-layer-01)] px-2 py-0.5 text-xs font-semibold text-[var(--bf-text-secondary)] ring-1 ring-[var(--bf-border-subtle)]">
            {status}
          </span>
        ) : null}
      </div>
      <p className="mt-2 break-keep font-mono text-xl font-bold tabular-nums text-[var(--bf-text-primary)]">
        {value}
      </p>
      {note ? (
        <p className="mt-1 text-xs leading-5 text-[var(--bf-text-muted)]">
          {note}
        </p>
      ) : null}
    </div>
  );
}
