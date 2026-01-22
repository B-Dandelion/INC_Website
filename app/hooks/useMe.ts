"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { useEffect, useMemo, useRef, useState } from "react";

const supabase = supabaseBrowser();

type Role = "member" | "admin";

export type MeResponse = {
  ok: true;
  isLoggedIn: boolean;
  approved: boolean;
  role: Role;
  user: null | { id: string; email: string | null };
  error?: string;
};

// 간단 메모리 캐시 (탭 유지 동안만)
let cached: { token: string | null; at: number; data: MeResponse | null } = {
  token: null,
  at: 0,
  data: null,
};

const TTL_MS = 15_000;

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function fetchMe(token: string | null, signal?: AbortSignal) {
  const res = await fetch("/api/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
    signal,
  });

  const out = (await res.json().catch(() => null)) as MeResponse | null;

  // /api/me가 ok:true 형태로 주는 걸 기대하지만, 안전빵
  if (!out || out.ok !== true) {
    return {
      ok: true,
      isLoggedIn: false,
      approved: false,
      role: "member",
      user: null,
      error: "bad response",
    } satisfies MeResponse;
  }
  return out;
}

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(cached.data);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const inflight = useRef<AbortController | null>(null);

  // 세션 복원 완료 신호 잡기
  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().finally(() => {
      if (alive) setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // INITIAL_SESSION 이후부터는 "세션이 확정"된 상태로 봐도 됨
      if (event === "INITIAL_SESSION") setAuthReady(true);

      cached = { token: null, at: 0, data: null };
      // 여기서 refresh 트리거를 별도로 주고 싶으면 tick state를 써도 됨
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = async () => {
    if (!authReady) return; // 아직 세션 확정 전이면 아무 것도 안 함

    inflight.current?.abort();
    const ac = new AbortController();
    inflight.current = ac;

    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;

      // 여기서 token이 null이면 "진짜 로그아웃"으로 볼 수 있음(이미 authReady니까)
      const dataMe = await fetchMe(token, ac.signal);

      cached = { token, at: Date.now(), data: dataMe };
      setMe(dataMe);
      return dataMe;
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      throw e;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const isAdmin = useMemo(
    () => !!me?.isLoggedIn && me.approved === true && me.role === "admin",
    [me],
  );

  // authReady 전에는 무조건 loading true로 유지
  return { me, loading: !authReady || loading, isAdmin, refresh };
}
