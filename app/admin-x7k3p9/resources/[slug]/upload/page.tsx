"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const ISSUE_BOARDS = new Set(["atm", "heartbeat-of-atoms"]);
const MAX_FILE_BYTES = 200 * 1024 * 1024;

export default function AdminUploadPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug || "");
  const isIssue = ISSUE_BOARDS.has(slug);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "member" | "admin"
  >("public");
  const [publishedAt, setPublishedAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!title.trim() || !file) return false;
    if (file.size > MAX_FILE_BYTES) return false;
    if (isIssue && !/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
      return false;
    }
    return true;
  }, [title, file, isIssue, publishedAt]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!file) {
      setErr("파일을 선택하세요.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setErr("파일 크기는 200MB 이하여야 합니다.");
      return;
    }

    if (!canSubmit) return;
    setBusy(true);

    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("boardSlug", slug);
      formData.set("visibility", visibility);
      formData.set("note", note);

      if (isIssue) {
        formData.set("publishedAt", publishedAt);
      }

      formData.set("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const out = await res.json().catch(() => null);

      if (res.status === 401) {
        alert("관리자 세션이 만료되었습니다. 다시 로그인해 주세요.");
        location.href = "/admin-x7k3p9?reason=session";
        return;
      }

      if (!res.ok) {
        setErr(
          out?.error ??
            out?.detail ??
            `업로드에 실패했습니다. (HTTP ${res.status})`
        );
        return;
      }

      router.replace(`/admin-x7k3p9/resources/${slug}`);
      router.refresh();
    } catch {
      setErr("업로드 중 네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>
        업로드: {slug}
      </h1>

      <form
        onSubmit={onSubmit}
        style={{ marginTop: 16, display: "grid", gap: 12 }}
      >
        <label style={labelStyle}>
          제목(필수)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          세부 내용(선택)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ ...inputStyle, minHeight: 80 }}
          />
        </label>

        <label style={labelStyle}>
          공개 범위
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as any)}
            style={inputStyle}
          >
            <option value="public">전체 공개</option>
            <option value="member">승인 회원</option>
            <option value="admin">관리자 전용</option>
          </select>
        </label>

        {isIssue ? (
          <label style={labelStyle}>
            발간일(필수)
            <input
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              style={inputStyle}
            />
          </label>
        ) : null}

        <label style={labelStyle}>
          파일(필수, 최대 200MB)
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.mp4,.mov,.webm,.mkv,.ppt,.pptx,.key,.doc,.docx,.hwp,.txt,.zip,.7z,.rar"
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              setFile(selected);
              if (selected && selected.size > MAX_FILE_BYTES) {
                setErr("파일 크기는 200MB 이하여야 합니다.");
              } else {
                setErr(null);
              }
            }}
          />
        </label>

        {file ? (
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            선택: {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
          </div>
        ) : null}

        {err ? (
          <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
            {err}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={!canSubmit || busy}
            style={btnStyle}
          >
            {busy ? "업로드 중..." : "업로드"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              router.push(`/admin-x7k3p9/resources/${slug}`)
            }
            style={{ ...btnStyle, opacity: 0.8 }}
          >
            취소
          </button>
        </div>
      </form>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 14,
};

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
