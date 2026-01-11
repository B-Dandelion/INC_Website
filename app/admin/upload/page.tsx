"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AdminUploadPage() {
  const [msg, setMsg] = useState("");
  const [json, setJson] = useState<any>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("업로드 중...");
    setJson(null);

    const fd = new FormData(e.currentTarget);
    
    // 여기서 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json().catch(() => ({}));
    setJson(data);
    setMsg(res.ok ? "성공" : `실패: ${res.status}`);
  }

  return (
    <div style={{ maxWidth: 720, margin: "32px auto", padding: 16 }}>
      <h1>Admin Upload</h1>

      <form onSubmit={onSubmit} encType="multipart/form-data">
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            Title
            <input name="title" required style={{ width: "100%" }} />
          </label>

          <label>
            Board Slug
            <select name="boardSlug" defaultValue="atm">
              <option value="atm">atm</option>
              <option value="heartbeat-of-atoms">heartbeat-of-atoms</option>
            </select>
          </label>

          <label>
            Visibility
            <select name="visibility" defaultValue="public">
              <option value="public">public</option>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </label>

          <label>
            Kind
            <select name="kind" defaultValue="pdf">
              <option value="pdf">pdf</option>
              <option value="image">image</option>
              <option value="video">video</option>
              <option value="doc">doc</option>
              <option value="zip">zip</option>
              <option value="link">link</option>
            </select>
          </label>

          <label>
            Published At (YYYY-MM-DD)
            <input name="publishedAt" placeholder="2026-01-08" />
          </label>

          <label>
            Note
            <input name="note" />
          </label>

          <label>
            File
            <input name="file" type="file" required />
          </label>

          <button type="submit">Upload</button>
        </div>
      </form>

      <p>{msg}</p>

      {json && (
        <pre style={{ background: "#111", color: "#0f0", padding: 12, overflowX: "auto" }}>
          {JSON.stringify(json, null, 2)}
        </pre>
      )}
    </div>
  );
}
