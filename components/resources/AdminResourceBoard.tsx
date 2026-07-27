"use client";

import { useState } from "react";
import styles from "./ResourceBoard.module.css";

type AdminItem = {
  id: number;
  title: string;
  subtitle?: string;
  rightMeta?: string;
  _raw?: any;
};

const ISSUE_BOARDS = new Set(["atm", "heartbeat-of-atoms"]);

function redirectIfExpired(res: Response) {
  if (res.status !== 401) return false;
  alert("관리자 세션이 만료되었습니다. 다시 로그인해 주세요.");
  location.href = "/admin-x7k3p9?reason=session";
  return true;
}

export default function AdminResourceBoard({
  items,
  boardSlug,
}: {
  items: AdminItem[];
  boardSlug: string;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  async function onDelete(id: number) {
    if (!confirm("삭제(soft delete)할까요?")) return;
    setBusyId(id);

    try {
      const res = await fetch("/api/admin/resources/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: id }),
      });

      if (redirectIfExpired(res)) return;

      if (!res.ok) {
        alert(`삭제 실패: ${await safeText(res)}`);
        return;
      }

      location.reload();
    } catch {
      alert("삭제 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function onEdit(item: AdminItem) {
    const nextTitle = prompt("제목", item.title);
    if (nextTitle == null) return;
    if (!nextTitle.trim()) {
      alert("제목은 비워둘 수 없습니다.");
      return;
    }

    const curNote = item._raw?.note ?? "";
    const nextNote = prompt(
      "note(상세 내용)",
      String(curNote ?? "")
    );
    if (nextNote == null) return;

    const isIssue = ISSUE_BOARDS.has(boardSlug);
    let nextPublishedAt: string | null = null;

    if (isIssue) {
      nextPublishedAt = (
        prompt(
          "발간일 (YYYY-MM-DD)",
          item._raw?.published_at ?? ""
        ) ?? ""
      ).trim();

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
    setBusyId(item.id);

    try {
      const res = await fetch("/api/admin/resources/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (redirectIfExpired(res)) return;

      if (!res.ok) {
        alert(`수정 실패: ${await safeText(res)}`);
        return;
      }

      location.reload();
    } catch {
      alert("수정 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function onReplace(id: number) {
    const input = document.createElement("input");
    input.type = "file";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const maxBytes = 200 * 1024 * 1024;
      if (file.size > maxBytes) {
        alert("파일 크기는 200MB 이하여야 합니다.");
        return;
      }

      const formData = new FormData();
      formData.set("resourceId", String(id));
      formData.set("file", file);
      setBusyId(id);

      try {
        const res = await fetch(
          "/api/admin/resources/replace",
          { method: "POST", body: formData }
        );

        if (redirectIfExpired(res)) return;

        if (!res.ok) {
          alert(`파일 교체 실패: ${await safeText(res)}`);
          return;
        }

        const out = await res.json().catch(() => null);
        if (out?.cleanupWarning) {
          alert(`파일은 교체됐지만 정리 경고가 있습니다.\n${out.cleanupWarning}`);
        }

        location.reload();
      } catch {
        alert("파일 교체 중 네트워크 오류가 발생했습니다.");
      } finally {
        setBusyId(null);
      }
    };

    input.click();
  }

  return (
    <div className={styles.board}>
      {items.map((item) => {
        const kind = item._raw?.kind as string | undefined;
        const visibility = item._raw?.visibility as string | undefined;
        const fileUrl = `/api/admin/resources/go?id=${item.id}`;
        const disabled = busyId === item.id;

        return (
          <div
            key={item.id}
            className={styles.row}
            style={{ cursor: "default", opacity: disabled ? 0.65 : 1 }}
          >
            <div
              className={styles.left}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              {kind === "image" ? (
                <img
                  src={fileUrl}
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
                  src={fileUrl}
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

              <div style={{ minWidth: 0 }}>
                <div className={styles.title}>{item.title}</div>
                {item.subtitle ? (
                  <div className={styles.sub}>{item.subtitle}</div>
                ) : null}
                {visibility ? (
                  <div style={{ fontSize: 12, marginTop: 4, opacity: 0.65 }}>
                    공개 범위: {visibility}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className={styles.right}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {item.rightMeta ? (
                <span className={styles.meta}>{item.rightMeta}</span>
              ) : null}

              <a
                className={styles.open}
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                title="새 창으로 열기"
              >
                열기
              </a>

              <button
                disabled={disabled}
                onClick={() => onEdit(item)}
                style={btnStyle}
              >
                수정
              </button>
              <button
                disabled={disabled}
                onClick={() => onReplace(item.id)}
                style={btnStyle}
              >
                교체
              </button>
              <button
                disabled={disabled}
                onClick={() => onDelete(item.id)}
                style={{ ...btnStyle, borderColor: "#ffb3b3" }}
              >
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
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const out = await res.json().catch(() => null);
      return out?.error ?? out?.detail ?? JSON.stringify(out);
    }

    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}
