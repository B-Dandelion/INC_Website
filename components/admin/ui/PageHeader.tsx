import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow = "INC Administration",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <section className="border-b border-slate-300 pb-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">{title}</h1>
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
