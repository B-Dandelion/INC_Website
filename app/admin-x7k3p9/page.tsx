"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminGate() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionExpired(params.get("reason") === "session");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!pw) {
      setErr("비밀번호를 입력하세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });

      const out = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(
          out?.error ??
            (res.status === 401
              ? "비밀번호가 올바르지 않습니다."
              : `로그인 처리에 실패했습니다. (HTTP ${res.status})`)
        );
        return;
      }

      router.replace("/admin-x7k3p9/resources");
      router.refresh();
    } catch {
      setErr("서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin</h1>
      <p style={{ opacity: 0.7, marginTop: 8 }}>
        관리자 비밀번호를 입력하세요.
      </p>

      {sessionExpired ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 8,
            background: "#fff7ed",
            color: "#9a3412",
            fontSize: 14,
          }}
        >
          관리자 세션이 만료되었습니다. 다시 로그인해 주세요.
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        style={{ marginTop: 16, display: "grid", gap: 10 }}
      >
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button
          type="submit"
          disabled={loading || !pw}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: loading || !pw ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "확인 중..." : "입장"}
        </button>
        {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
      </form>
    </main>
  );
}
