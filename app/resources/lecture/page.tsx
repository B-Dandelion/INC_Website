import ResourcesFrame from "@/components/resources/ResourcesFrame";
import ResourceBoard, { type BoardItem } from "@/components/resources/ResourceBoard";
import styles from "./lecture.module.css";
import { fetchResources, type ResourceRow } from "@/lib/resourcesDb";

function norm(p: string) {
  return p.replaceAll("\\", "/");
}

function groupNameOf(r: ResourceRow, boardSlug: string) {
  const sp = r.source_path ? norm(r.source_path) : "";
  const parts = sp.split("/").filter(Boolean);
  if (parts[0] !== boardSlug) return "기타";
  return parts[1] ?? "기타";
}

function isImage(r: ResourceRow) {
  const fn = (r.original_filename ?? "").toLowerCase();
  return (
    r.kind === "image" ||
    fn.endsWith(".jpg") ||
    fn.endsWith(".jpeg") ||
    fn.endsWith(".png") ||
    fn.endsWith(".webp")
  );
}

function toBoardItem(r: ResourceRow): BoardItem {
  const t = ((r.title ?? "").trim() || r.original_filename || "자료").toString();
  const sub = (r.original_filename ?? "").toString();
  return { id: r.id, title: t, subtitle: sub };
}

export default async function LecturePage() {
  const boardSlug = "lecture";
  const rows = await fetchResources({ boardSlug, page: 1, pageSize: 1000 });
  const groups = new Map<string, { images: ResourceRow[]; files: ResourceRow[] }>();

  for (const r of rows ?? []) {
    const gname = groupNameOf(r, boardSlug);
    if (!groups.has(gname)) groups.set(gname, { images: [], files: [] });
    const g = groups.get(gname)!;
    if (isImage(r)) g.images.push(r);
    else g.files.push(r);
  }

  const collator = new Intl.Collator("ko-KR", { numeric: true, sensitivity: "base" });
  const sorted = [...groups.entries()].sort((a, b) => collator.compare(a[0], b[0]));

  return (
    <ResourcesFrame activeKey="lecture">
      <div className={styles.content}>
        <header className={styles.hero}>
          <div className={styles.eyebrow}>Lecture archive</div>
          <h1 className={styles.h1}>강연자료</h1>
          <div className={styles.meta}>강연별 사진과 자료를 한 곳에서 확인할 수 있습니다.</div>
        </header>

        {sorted.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.muted}>등록된 자료가 없습니다.</div>
          </div>
        ) : (
          <div className={styles.groups}>
            {sorted.map(([name, g]) => {
              g.images.sort((a, b) => (a.source_path ?? "").localeCompare(b.source_path ?? ""));
              g.files.sort((a, b) => (a.source_path ?? "").localeCompare(b.source_path ?? ""));
              const fileItems = g.files.map(toBoardItem);

              return (
                <section key={name} className={styles.groupCard}>
                  <div className={styles.groupHeader}>
                    <div className={styles.groupTitle}>{name}</div>
                    <div className={styles.groupMeta}>
                      {g.images.length > 0 ? `사진 ${g.images.length}` : ""}
                      {g.images.length > 0 && fileItems.length > 0 ? " · " : ""}
                      {fileItems.length > 0 ? `자료 ${fileItems.length}` : ""}
                    </div>
                  </div>

                  {g.images.length > 0 ? (
                    <>
                      <div className={styles.sectionLabel}>사진</div>
                      <div className={styles.thumbGrid}>
                        {g.images.map((img) => {
                          const src = `/api/resources/go?id=${img.id}`;
                          const caption =
                            ((img.title ?? "").trim() || img.original_filename || "이미지").toString();

                          return (
                            <a
                              key={img.id}
                              className={styles.thumb}
                              href={src}
                              target="_blank"
                              rel="noreferrer"
                              title={caption}
                            >
                              <img className={styles.thumbImg} src={src} alt={caption} loading="lazy" />
                              <div className={styles.thumbCap}>{caption}</div>
                            </a>
                          );
                        })}
                      </div>
                    </>
                  ) : null}

                  {fileItems.length > 0 ? (
                    <>
                      <div className={styles.sectionLabel}>자료</div>
                      <ResourceBoard items={fileItems} />
                    </>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </ResourcesFrame>
  );
}
