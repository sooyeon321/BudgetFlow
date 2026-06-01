type SummaryTone = "default" | "success" | "warning" | "danger";

type SummaryCardProps = {
  label: string;
  note?: string;
  status?: string;
  value: string;
  tone?: SummaryTone;
};

const toneClass: Record<SummaryTone, string> = {
  default: "border-[#E1E6EA]",
  success: "border-[#1E9E62] bg-[#E6F4EC]/60",
  warning: "border-[#C9821A] bg-[#FBF0DC]/70",
  danger: "border-[#C8443B] bg-[#FBE9E7]/60",
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
      className={`rounded-xl border bg-white p-4 shadow-sm ${toneClass[tone]}`}
    >
      <div className="flex min-h-6 items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#4D575F]">{label}</p>
        {status ? (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-[#4D575F] ring-1 ring-[#E1E6EA]">
            {status}
          </span>
        ) : null}
      </div>
      <p className="mt-2 break-keep font-mono text-xl font-bold tabular-nums tracking-tight text-[#161B1F]">
        {value}
      </p>
      {note ? (
        <p className="mt-1 text-xs leading-5 text-[#9AA6AF]">{note}</p>
      ) : null}
    </div>
  );
}
