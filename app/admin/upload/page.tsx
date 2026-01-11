"use client";

import { useState } from "react";

export default function AdminUploadPage() {
  const [msg, setMsg] = useState<string>("");
  const [link, setLink] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("업로드 중...");
    setLink("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) {
      setMsg(`실패: ${json?.error || res.statusText}`);
      return;
    }

    setMsg("성공");
    if (json.publicUrl) setLink(json.publicUrl);
  }

  return (
    <div style={{ maxWidth: 720, margin: "32px auto", padding: 16 }}>
      <h1>Admin Upload</h1>

      <form onSubmit={onSubmit} encType="multipart/form-data">
        <div>
          <label>Board</label>
          <select name="boardSlug" defaultValue="heartbeat-of-atoms">
            <option value="heartbeat-of-atoms">Heartbeat of Atoms</option>
            <option value="atm">ATM</option>
          </select>
        </div>

        <div>
          <label>Visibility</label>
          <select name="visibility" defaultValue="public">
            <option value="public">public</option>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div>
          <label>Kind</label>
          <select name="kind" defaultValue="pdf">
            <option value="pdf">pdf</option>
            <option value="image">image</option>
            <option value="video">video</option>
            <option value="doc">doc</option>
            <option value="zip">zip</option>
            <option value="link">link</option>
          </select>
        </div>

        <div>
          <label>Title</label>
          <input name="title" required />
        </div>

        <div>
          <label>Published at</label>
          <input name="publishedAt" placeholder="YYYY-MM-DD" />
        </div>

        <div>
          <label>Note</label>
          <input name="note" />
        </div>

        <div>
          <label>File</label>
          <input name="file" type="file" required />
        </div>

        <button type="submit" style={{ marginTop: 12 }}>
          Upload
        </button>
      </form>

      <p style={{ marginTop: 12 }}>{msg}</p>
      {link ? (
        <p>
          결과 링크:{" "}
          <a href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
        </p>
      ) : null}
    </div>
  );
}