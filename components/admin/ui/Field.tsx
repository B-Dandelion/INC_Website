import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10 disabled:bg-slate-50 disabled:text-slate-500";

// Label + control + optional hint/error, so every form reads the same way.
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-2 text-sm font-semibold text-slate-700", className)}>
      <span>
        {label}
        {required ? <span className="ml-1 text-red-700" aria-hidden="true">*</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-xs font-medium text-red-700">{error}</span>
      ) : hint ? (
        <span className="text-xs font-normal text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function TextArea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "resize-y leading-6", className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-8", className)} {...rest} />;
}
