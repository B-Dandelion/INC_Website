"use client";

import { useMemo, useState } from "react";
import { routeToBoardSlug } from "@/lib/routeMaps";

function extKind(fileName: string) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["hwp", "hwpx"].includes(ext)) return "hwp";
  return "file";
}

export default function UploadClient({ route }: { route: string }) {
  const boardSlug = useMemo(() => routeToBoardSlug[route] ?? route, [route]);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [publishedAt, setPublishedAt] = useState(""); // yyyy-mm-dd
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onUpload() {
    if (!file) return setMsg("파일을 선택해.");
    const finalTitle = title.trim() || file.name;

    setBusy(true);
    setMsg("");

    try {
      // 1) presign
      const pres = await fetch("/api/admin/resources/presign", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": (process.env.NEXT_PUBLIC_ADMIN_TASK_TOKEN as string) ?? "",
        },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      }).then((r) => r.json());

      if (pres.error) throw new Error(pres.error);

      // 2) upload to R2
      const up = await fetch(pres.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!up.ok) throw new Error(`R2 upload failed: ${up.status}`);

      // 3) insert DB
      const kind = extKind(file.name);
      const created = await fetch("/api/admin/resources/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": (process.env.NEXT_PUBLIC_ADMIN_TASK_TOKEN as string) ?? "",
        },
        body: JSON.stringify({
          boardSlug,
          title: finalTitle,
          kind,
          note,
          published_at: publishedAt || null,
          visibility: "public",
          r2_key: pres.key,
        }),
      }).then((r) => r.json());

      if (created.error) throw new Error(created.error);

      setMsg(`완료: resource id = ${created.id}`);
      setFile(null);
      setTitle("");
      setPublishedAt("");
      setNote("");
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>자료 업로드</h1>
      <p>카테고리: <b>{boardSlug}</b> (route: {route})</p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

        <input
          placeholder="제목(비우면 파일명 사용)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="발행일(yyyy-mm-dd)"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
        />

        <input
          placeholder="메모(선택)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button onClick={onUpload} disabled={busy}>
          {busy ? "업로드 중..." : "업로드"}
        </button>

        {msg && <pre style={{ whiteSpace: "pre-wrap" }}>{msg}</pre>}
      </div>
    </main>
  );
}