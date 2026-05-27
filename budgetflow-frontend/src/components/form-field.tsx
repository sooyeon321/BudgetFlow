import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
