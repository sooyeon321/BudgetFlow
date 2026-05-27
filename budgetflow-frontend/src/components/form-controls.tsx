import type { ComponentProps } from "react";

export const formControlClass =
  "w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`${formControlClass} h-10 ${className ?? ""}`}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`${formControlClass} min-h-28 resize-none py-2.5 ${className ?? ""}`}
      {...props}
    />
  );
}

export function SelectInput({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`${formControlClass} h-10 ${className ?? ""}`}
      {...props}
    />
  );
}
