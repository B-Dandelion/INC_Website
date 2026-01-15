"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function safeNext(raw: string | null) {
  if (!raw) return "/";
  // next는 내부 경로만 허용 (오픈 리다이렉트 방지)
  if (raw.startsWith("/")) return raw;
  return "/";
}

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextUrl = useMemo(() => safeNext(sp.get("next")), [sp]);

  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1) 이미 로그인된 상태면 바로 next로 이동
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        if (data.session) {
          router.replace(nextUrl);
          return;
        }
      } finally {
        if (alive) setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, nextUrl]);

  // 2) 로그인/토큰갱신 등 auth 이벤트에 따라 리다이렉트
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace(nextUrl);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [router, nextUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const em = email.trim();
    if (!em || !password) {
      setErrorMsg("이메일과 비밀번호를 입력하세요.");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: em,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // 성공 시 onAuthStateChange에서 replace 처리됨
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main style={{ padding: 24 }}>
        <div>Loading…</div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Login</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              outline: "none",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              outline: "none",
            }}
          />
        </label>

        {errorMsg ? (
          <div style={{ color: "#b00020", fontSize: 13 }}>{errorMsg}</div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            fontWeight: 700,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
            background: "#2563eb",
            color: "white",
          }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          로그인 성공 시 이동: <code>{nextUrl}</code>
        </div>
      </form>
    </main>
  );
}