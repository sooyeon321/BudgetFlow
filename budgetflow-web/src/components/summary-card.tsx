type SummaryTone = "default" | "success" | "warning" | "danger";

type SummaryCardProps = {
  label: string;
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
  value,
  tone = "default",
}: SummaryCardProps) {
  return (
    <div
      className={`rounded-xl border bg-background p-4 shadow-sm ${toneClassByTone[tone]}`}
    >
      <p className="text-sm font-medium text-zinc-600">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
