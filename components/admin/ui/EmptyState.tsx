import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 px-5 py-12 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="max-w-md text-sm text-slate-600">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
