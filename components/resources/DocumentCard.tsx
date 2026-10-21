// components/resources/DocumentCard.tsx
// One downloadable resource as a card: file type, title, description and
// facts (date, size, views). Opens the file in a new tab.
import { Eye } from "lucide-react";
import type { ResourceRow } from "@/lib/resourcesDb";

type FileType = { label: string; tone: string };

const TYPES: Record<string, FileType> = {
  pdf: { label: "PDF", tone: "bg-[#FDF2F2] text-[#9B1C1C] ring-[#F5D0D0]" },
  doc: { label: "DOC", tone: "bg-[#EEF4FA] text-[#174A7E] ring-[#CFE0F0]" },
  hwp: { label: "HWP", tone: "bg-[#EEF4FA] text-[#174A7E] ring-[#CFE0F0]" },
  slide: { label: "PPT", tone: "bg-[#FDF5EC] text-[#9A4A0B] ring-[#F2DCC2]" },
  image: { label: "IMG", tone: "bg-[#EEF6F1] text-[#1F6B43] ring-[#CFE6D8]" },
  video: { label: "VIDEO", tone: "bg-[#F3F1FA] text-[#4B3A8C] ring-[#DDD7F0]" },
  zip: { label: "ZIP", tone: "bg-slate-100 text-slate-700 ring-slate-200" },
};

export function fileType(row: Pick<ResourceRow, "kind" | "original_filename">): FileType {
  const ext = (row.original_filename ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext === "hwp") return TYPES.hwp;
  return TYPES[row.kind] ?? { label: (ext || "FILE").toUpperCase().slice(0, 5), tone: "bg-slate-100 text-slate-700 ring-slate-200" };
}

export function formatSize(bytes: number | null | undefined) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function FileBadge({ row }: { row: Pick<ResourceRow, "kind" | "original_filename"> }) {
  const t = fileType(row);
  return (
    <span className={`inline-flex h-12 w-10 shrink-0 items-end justify-center rounded-[4px] pb-1.5 text-[10px] font-bold tracking-wide ring-1 ring-inset ${t.tone}`} aria-hidden="true">
      {t.label}
    </span>
  );
}

export default function DocumentCard({ row, en }: { row: ResourceRow; en: boolean }) {
  const title = (row.title ?? "").trim() || row.original_filename || (en ? "Untitled" : "제목 없음");
  const note = (row.note ?? "").trim();
  const date = (row.published_at || row.posted_at || "").slice(0, 10);
  const size = formatSize(row.size_bytes);
  const t = fileType(row);
  return (
    <a
      href={`/api/resources/go?id=${row.id}`}
      target="_blank"
      rel="noopener"
      className="group flex h-full min-w-0 gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-[#9BB9D6] hover:bg-[#FBFDFF]"
    >
      <FileBadge row={row} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere] group-hover:text-[#174A7E]">{title}</p>
        {note ? <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600 [overflow-wrap:anywhere]">{note}</p> : null}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12px] text-slate-600">
          {date ? <span>{date}</span> : null}
          <span aria-hidden="true">·</span>
          <span>{t.label}</span>
          {size ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{size}</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{en ? "Views" : "조회"}</span>
            {row.views_count ?? 0}
          </span>
        </p>
      </div>
    </a>
  );
}
