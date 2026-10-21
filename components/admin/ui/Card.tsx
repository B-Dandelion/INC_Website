import type { ReactNode } from "react";
import { cn } from "./cn";

export function Card({
  title,
  description,
  icon,
  actions,
  tone = "default",
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  tone?: "default" | "danger";
  className?: string;
  children?: ReactNode;
}) {
  const hasHeader = title || description || actions;
  return (
    <section className={cn("border bg-white", tone === "danger" ? "border-red-200" : "border-slate-200", className)}>
      {hasHeader ? (
        <div className={cn("flex items-center gap-3 border-b px-5 py-4", tone === "danger" ? "border-red-100" : "border-slate-200")}>
          {icon ? (
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                tone === "danger" ? "bg-red-50 text-red-700" : "bg-[#EEF4FA] text-[#174A7E]",
              )}
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            {title ? <h2 className={cn("text-base font-semibold", tone === "danger" ? "text-red-800" : "text-slate-900")}>{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
