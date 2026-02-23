"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminGate() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        setErr("비밀번호가 틀렸습니다.");
        return;
      }
      router.push("/admin-x7k3p9/resources");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin</h1>
      <p style={{ opacity: 0.7, marginTop: 8 }}>관리자 비밀번호를 입력하세요.</p>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}
        >
          {loading ? "확인 중..." : "입장"}
        </button>
        {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
      </form>
    </main>
  );
}