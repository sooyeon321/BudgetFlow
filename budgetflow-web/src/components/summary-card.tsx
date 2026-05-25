type SummaryTone = "default" | "success" | "warning" | "danger";

type SummaryCardProps = {
  label: string;
  note?: string;
  status?: string;
  value: string;
  tone?: SummaryTone;
};

const toneClassByTone: Record<SummaryTone, string> = {
  default: "border-zinc-200",
  success: "border-emerald-200 bg-emerald-50/70",
  warning: "border-amber-200 bg-amber-50/80",
  danger: "border-red-200 bg-red-50/70",
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
      className={`rounded-[10px] border bg-background p-4 shadow-sm ${toneClassByTone[tone]}`}
    >
      <div className="flex min-h-6 items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        {status ? (
          <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
            {status}
          </span>
        ) : null}
      </div>
      <p className="mt-2 break-keep text-xl font-bold tracking-tight tabular-nums text-zinc-950">
        {value}
      </p>
      {note ? <p className="mt-1 text-xs leading-5 text-zinc-500">{note}</p> : null}
    </div>
  );
}
