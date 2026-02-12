// components/resources/SimpleListPage.tsx
import ResourcesFrame, { type ResourceNavKey } from "@/components/resources/ResourcesFrame";
import ResourceBoard, { type BoardItem } from "@/components/resources/ResourceBoard";
import styles from "./SimpleListPage.module.css";
import { fetchResources } from "@/lib/resourcesDb";

type Props = {
  activeKey: ResourceNavKey;
  title: string;
  prefix: string; // ✅ 이제 "boardSlug"로 사용 (예: "lecture", "atm", "heartbeat-of-atoms")
  hint?: string;
  rightMetaFromTitle?: (title: string) => string;
};

export default async function SimpleListPage({
  activeKey,
  title,
  prefix,
  hint,
  rightMetaFromTitle,
}: Props) {
  // 보드 기준으로 가져오기 (ATM/Heartbeat 포함 전부 정상)
  const rows = await fetchResources({ boardSlug: prefix, page: 1, pageSize: 200 });

  const boardItems: BoardItem[] = (rows ?? []).map((r: any) => {
    const titleText = ((r.title ?? "").trim() || r.original_filename || "자료").toString();
    const subText = (r.original_filename ?? "").toString();

    return {
      id: r.id,
      title: titleText,
      subtitle: subText,
      rightMeta: rightMetaFromTitle ? rightMetaFromTitle(titleText) : "",
    };
  });

  return (
    <ResourcesFrame activeKey={activeKey}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>{title}</h1>
          {hint ? <div className={styles.meta}>{hint}</div> : null}
        </div>

        {boardItems.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.muted}>등록된 자료가 없습니다.</div>
          </div>
        ) : (
          <ResourceBoard items={boardItems} />
        )}
      </div>
    </ResourcesFrame>
  );
}
