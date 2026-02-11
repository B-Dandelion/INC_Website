// components/resources/SimpleListPage.tsx
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import styles from "./SimpleListPage.module.css";
import { fetchResourcesByPrefix } from "@/lib/resourcesDb";

type Props = {
  activeKey: any; // ResourceNavKey로 타입 잡혀있으면 그걸로 바꿔
  title: string;
  prefix: string; // 예: "lectures", "columns" ...
  hint?: string;  // 상단 한 줄 설명
};

export default async function SimpleListPage({ activeKey, title, prefix, hint }: Props) {
  const items = await fetchResourcesByPrefix(prefix);

  return (
    <ResourcesFrame activeKey={activeKey}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>{title}</h1>
          {hint ? <div className={styles.meta}>{hint}</div> : null}
        </div>

        {items.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.muted}>등록된 자료가 없습니다.</div>
          </div>
        ) : (
          <div className={styles.list}>
            {items.map((r) => {
              const t = (r.title ?? "").trim() || (r.original_filename ?? "자료");
              const sub = r.original_filename ?? r.source_path ?? "";
              return (
                <a
                  key={r.id}
                  className={styles.row}
                  href={`/api/resources/go?id=${r.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className={styles.rowLeft}>
                    <div className={styles.rowTitle}>{t}</div>
                    {sub ? <div className={styles.rowSub}>{sub}</div> : null}
                  </div>
                  <div className={styles.rowRight}>파일 열기 →</div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </ResourcesFrame>
  );
}
