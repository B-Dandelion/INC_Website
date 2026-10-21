// components/resources/BoardHeader.tsx
// Shared page header for resource boards: breadcrumb, title, one-line
// description and a row of plain facts.
import Link from "next/link";

export default function BoardHeader({
  group,
  title,
  description,
  facts,
  children,
  en,
}: {
  group: string;
  title: string;
  description: string;
  facts: string[];
  children?: React.ReactNode;
  en: boolean;
}) {
  return (
    <header className="mb-8 border-b border-slate-200 pb-7">
      <nav aria-label={en ? "Breadcrumb" : "위치"} className="text-[13px] font-semibold text-slate-600">
        <Link href="/resources" className="hover:text-[#174A7E]">
          {en ? "Resources" : "자료실"}
        </Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span>{group}</span>
      </nav>
      <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.03em] text-slate-950">{title}</h1>
      <p className="mt-2 text-[15px] leading-7 text-slate-600">{description}</p>
      {facts.length ? (
        <ul className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold text-slate-700">
          {facts.map((f) => (
            <li key={f} className="rounded-md bg-white px-2.5 py-1 ring-1 ring-slate-200">
              {f}
            </li>
          ))}
        </ul>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}
