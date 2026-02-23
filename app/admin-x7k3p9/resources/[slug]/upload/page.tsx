"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const ISSUE_BOARDS = new Set(["atm", "heartbeat-of-atoms"]);

export default function AdminUploadPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug || "");
  const isIssue = ISSUE_BOARDS.has(slug);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<"public" | "member" | "admin">("public");
  const [publishedAt, setPublishedAt] = useState(""); // ATM/Heartbeat only
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!file) return false;
    if (isIssue && !/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) return false;
    return true;
  }, [title, file, isIssue, publishedAt]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!canSubmit) return;

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("title", title.trim());
      fd.set("boardSlug", slug);
      fd.set("visibility", visibility);
      fd.set("note", note);
      if (isIssue) fd.set("publishedAt", publishedAt);
      if (file) fd.set("file", file);

      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setErr(text || `업로드 실패 (HTTP ${res.status})`);
        return;
      }

      router.push(`/admin-x7k3p9/resources/${slug}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>업로드: {slug}</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label style={labelStyle}>
          제목(필수)
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          note(선택, 상세)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />
        </label>

        <label style={labelStyle}>
          공개범위
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} style={inputStyle}>
            <option value="public">public</option>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
        </label>

        {isIssue ? (
          <label style={labelStyle}>
            발간일(필수, YYYY-MM-DD)
            <input
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              placeholder="2026-02-24"
              style={inputStyle}
            />
          </label>
        ) : null}

        <label style={labelStyle}>
          파일(필수)
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        {err ? <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div> : null}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={!canSubmit || busy} style={btnStyle}>
            {busy ? "업로드 중..." : "업로드"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/admin-x7k3p9/resources/${slug}`)}
            style={{ ...btnStyle, opacity: 0.8 }}
          >
            취소
          </button>
        </div>

        {!isIssue ? (
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            게시일(posted_at)은 자동으로 오늘 날짜로 저장됩니다.
          </div>
        ) : (
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            ATM/Heartbeat는 발간일(published_at)이 검색 기준입니다.
          </div>
        )}
      </form>
    </main>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 6, fontSize: 14 };
const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 14,
};
const btnStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};