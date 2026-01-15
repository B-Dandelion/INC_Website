"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Role = "member" | "admin";

export type MeResponse = {
  ok: true;
  isLoggedIn: boolean;
  approved: boolean;
  role: Role;
  user: null | { id: string; email: string | null };
  error?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// 간단 메모리 캐시 (탭 유지 동안만)
let cached: { token: string | null; at: number; data: MeResponse | null } = {
  token: null,
  at: 0,
  data: null,
};

const TTL_MS = 15_000; // 너무 길 필요 없음(렉 줄이기용)

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
  if (!out || out.ok !== true) {
    // /api/me는 ok:true로 내려주고 있으니 여기엔 거의 안 걸림
    return {
      ok: true,
      isLoggedIn: false,
      approved: false,
      role: "member" as Role,
      user: null,
      error: "bad response",
    } satisfies MeResponse;
  }
  return out;
}

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(cached.data);
  const [loading, setLoading] = useState(!cached.data);
  const [tick, setTick] = useState(0);

  const inflight = useRef<AbortController | null>(null);

  const refresh = async () => {
    inflight.current?.abort();
    const ac = new AbortController();
    inflight.current = ac;

    setLoading(true);
    try {
      const token = await getToken();

      const now = Date.now();
      const cacheValid =
        cached.data && cached.token === token && now - cached.at < TTL_MS;

      if (cacheValid) {
        setMe(cached.data);
        return cached.data;
      }

      const data = await fetchMe(token, ac.signal);
      cached = { token, at: now, data };
      setMe(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  // mount + tick 변화 시 refresh
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // auth 변화 감지 → 캐시 무효화 후 refresh
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      cached = { token: null, at: 0, data: null };
      setTick((v) => v + 1);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = useMemo(
    () => !!me?.isLoggedIn && me.approved === true && me.role === "admin",
    [me],
  );

  return { me, loading, isAdmin, refresh };
}
