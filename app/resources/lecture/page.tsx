import ResourcesFrame from "@/components/resources/ResourcesFrame";
import BoardHeader from "@/components/resources/BoardHeader";
import DocumentCard from "@/components/resources/DocumentCard";
import { fetchResources, type ResourceRow } from "@/lib/resourcesDb";
import { getLocale } from "@/lib/i18n";

function norm(p: string) {
  return p.replaceAll("\\", "/");
}

// Files are stored under lecture/<lecture name>/..., which groups them per lecture.
function groupNameOf(r: ResourceRow, fallback: string) {
  const parts = (r.source_path ? norm(r.source_path) : "").split("/").filter(Boolean);
  if (parts[0] !== "lecture") return fallback;
  return parts[1] ?? fallback;
}

function isImage(r: ResourceRow) {
  const fn = (r.original_filename ?? "").toLowerCase();
  return r.kind === "image" || /\.(jpe?g|png|webp|gif)$/.test(fn);
}

export default async function LecturePage() {
  const locale = await getLocale();
  const en = locale === "en";
  const rows = await fetchResources({ boardSlug: "lecture", page: 1, pageSize: 1000 });
  const fallbackGroup = en ? "Other" : "기타";

  const groups = new Map<string, { images: ResourceRow[]; files: ResourceRow[]; latest: string }>();
  for (const r of rows ?? []) {
    const name = groupNameOf(r, fallbackGroup);
    const g = groups.get(name) ?? { images: [], files: [], latest: "" };
    (isImage(r) ? g.images : g.files).push(r);
    const d = (r.posted_at ?? "").slice(0, 10);
    if (d > g.latest) g.latest = d;
    groups.set(name, g);
  }
  // Newest lecture first.
  const sorted = [...groups.entries()].sort((a, b) => b[1].latest.localeCompare(a[1].latest) || b[0].localeCompare(a[0], "ko"));
  const photoCount = sorted.reduce((n, [, g]) => n + g.images.length, 0);
  const fileCount = sorted.reduce((n, [, g]) => n + g.files.length, 0);

  return (
    <ResourcesFrame activeKey="lecture">
      <div className="mx-auto max-w-[1040px] pb-12">
        <BoardHeader
          group={en ? "Reports & writing" : "보고서·기고"}
          title={en ? "Lecture Materials" : "강연자료"}
          description={en ? "Photos and materials from each lecture, newest first." : "강연별 사진과 발표 자료를 최신 강연부터 모았습니다."}
          facts={[
            en ? `${sorted.length} lectures` : `강연 ${sorted.length}건`,
            en ? `${fileCount} materials` : `자료 ${fileCount}건`,
            en ? `${photoCount} photos` : `사진 ${photoCount}장`,
          ]}
          en={en}
        />

        {sorted.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
            {en ? "No resources to display." : "등록된 자료가 없습니다."}
          </div>
        ) : (
          <div className="grid gap-6">
            {sorted.map(([name, g]) => {
              g.images.sort((a, b) => (a.source_path ?? "").localeCompare(b.source_path ?? ""));
              g.files.sort((a, b) => (a.source_path ?? "").localeCompare(b.source_path ?? ""));
              return (
                <section key={name} className="rounded-lg border border-slate-200 bg-white" aria-labelledby={`lec-${name}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-5 py-4">
                    <h2 id={`lec-${name}`} className="text-[17px] font-bold tracking-[-0.01em] text-slate-950">
                      {name}
                    </h2>
                    <p className="text-[13px] text-slate-600">
                      {[
                        g.latest,
                        g.files.length ? (en ? `${g.files.length} materials` : `자료 ${g.files.length}`) : null,
                        g.images.length ? (en ? `${g.images.length} photos` : `사진 ${g.images.length}`) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="grid gap-5 p-5">
                    {g.files.length ? (
                      <ul className="grid gap-3 md:grid-cols-2">
                        {g.files.map((r) => (
                          <li key={r.id} className="min-w-0">
                            <DocumentCard row={r} en={en} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {g.images.length ? (
                      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label={en ? "Photos" : "사진"}>
                        {g.images.map((img, i) => {
                          const raw = ((img.title ?? "").trim() || (img.original_filename ?? "").replace(/\.[^.]+$/, "")).toString();
                          // Camera/upload file names ("1737598868893 (1)") say nothing, so they are not shown.
                          const caption = /^[\d\s()_.-]+$/.test(raw) ? null : raw;
                          const photoName = caption ?? (en ? `${name} photo ${i + 1}` : `${name} 사진 ${i + 1}`);
                          return (
                            <li key={img.id}>
                              <a
                                href={`/api/resources/go?id=${img.id}`}
                                target="_blank"
                                rel="noopener"
                                className="group block overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                              >
                                <img
                                  src={`/api/resources/media?id=${img.id}&w=640`}
                                  srcSet={`/api/resources/media?id=${img.id}&w=320 320w, /api/resources/media?id=${img.id}&w=640 640w`}
                                  sizes="(min-width: 1024px) 250px, (min-width: 640px) 33vw, 50vw"
                                  alt={caption ? "" : photoName}
                                  loading="lazy"
                                  decoding="async"
                                  className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                />
                                {caption ? <span className="block truncate px-2.5 py-1.5 text-[12px] text-slate-600">{caption}</span> : null}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </ResourcesFrame>
  );
}
