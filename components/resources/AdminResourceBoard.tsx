"use client";

import styles from "./ResourceBoard.module.css";

type AdminItem = {
  id: number;
  title: string;
  subtitle?: string;
  rightMeta?: string;
  _raw?: any;
};

const ISSUE_BOARDS = new Set(["atm", "heartbeat-of-atoms"]);

export default function AdminResourceBoard({
  items,
  boardSlug,
}: {
  items: AdminItem[];
  boardSlug: string;
}) {
  async function onDelete(id: number) {
    if (!confirm("삭제(soft delete)할까요?")) return;

    const res = await fetch("/api/admin/resources/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId: id }),
    });

    if (!res.ok) {
      const t = await safeText(res);
      alert(`삭제 실패: ${t}`);
      return;
    }
    location.reload();
  }

  async function onEdit(item: AdminItem) {
    const nextTitle = prompt("제목", item.title) ?? "";
    if (!nextTitle.trim()) return;

    const curNote = item._raw?.note ?? item.subtitle ?? "";
    const nextNote = prompt("note(상세 내용)", String(curNote ?? "")) ?? "";

    const isIssue = ISSUE_BOARDS.has(boardSlug);
    let nextPublishedAt: string | null = null;

    if (isIssue) {
      nextPublishedAt = (prompt("발간일 (YYYY-MM-DD)", item._raw?.published_at ?? "") ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextPublishedAt)) {
        alert("발간일 형식이 올바르지 않습니다. (YYYY-MM-DD)");
        return;
      }
    }

    const payload: any = {
      resourceId: item.id,
      title: nextTitle.trim(),
      note: nextNote,
    };
    if (isIssue) payload.published_at = nextPublishedAt;

    const res = await fetch("/api/admin/resources/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await safeText(res);
      alert(`수정 실패: ${t}`);
      return;
    }
    location.reload();
  }

  async function onReplace(id: number) {
    const input = document.createElement("input");
    input.type = "file";

    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;

      const fd = new FormData();
      fd.set("resourceId", String(id));
      fd.set("file", f);

      const res = await fetch("/api/admin/resources/replace", { method: "POST", body: fd });

      if (!res.ok) {
        const t = await safeText(res);
        alert(`파일 교체 실패: ${t}`);
        return;
      }
      location.reload();
    };

    input.click();
  }

  return (
    <div className={styles.board}>
      {items.map((it) => {
        const kind = it._raw?.kind as string | undefined;
        const thumbUrl = `/api/resources/go?id=${it.id}`;

        return (
          <div key={it.id} className={styles.row} style={{ cursor: "default" }}>
            {/* LEFT: thumbnail + text */}
            <div className={styles.left} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* thumbnail */}
              {kind === "image" ? (
                <img
                  src={thumbUrl}
                  alt=""
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #eee",
                    flex: "0 0 auto",
                  }}
                />
              ) : kind === "video" ? (
                <video
                  src={thumbUrl}
                  muted
                  playsInline
                  preload="metadata"
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #eee",
                    flex: "0 0 auto",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    border: "1px solid #eee",
                    display: "grid",
                    placeItems: "center",
                    opacity: 0.6,
                    fontSize: 12,
                    flex: "0 0 auto",
                  }}
                  title={kind ?? "file"}
                >
                  {kind ?? "file"}
                </div>
              )}

              {/* text */}
              <div style={{ minWidth: 0 }}>
                <div className={styles.title}>{it.title}</div>
                {it.subtitle ? <div className={styles.sub}>{it.subtitle}</div> : null}
              </div>
            </div>

            {/* RIGHT: buttons */}
            <div
              className={styles.right}
              style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
            >
              {it.rightMeta ? <span className={styles.meta}>{it.rightMeta}</span> : null}

              <a className={styles.open} href={thumbUrl} target="_blank" rel="noreferrer" title="새 창으로 열기">
                열기
              </a>

              <button onClick={() => onEdit(it)} style={btnStyle}>
                수정
              </button>
              <button onClick={() => onReplace(it.id)} style={btnStyle}>
                교체
              </button>
              <button onClick={() => onDelete(it.id)} style={{ ...btnStyle, borderColor: "#ffb3b3" }}>
                삭제
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "6px 10px",
  background: "white",
  cursor: "pointer",
};

async function safeText(res: Response) {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = await res.json().catch(() => null);
      return j ? JSON.stringify(j) : `HTTP ${res.status}`;
    }
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}