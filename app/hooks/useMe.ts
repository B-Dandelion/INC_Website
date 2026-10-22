"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { isAbortError } from "@/lib/errors";

const supabase = supabaseBrowser();

type Role = "member" | "admin";
type ReviewStatus = "pending" | "approved" | "rejected";

export type MeResponse = {
  ok: true;
  isLoggedIn: boolean;
  approved: boolean;
  role: Role;
  reviewStatus: ReviewStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  user: null | { id: string; email: string | null };
  error?: string;
};

let cached: { token: string | null; at: number; data: MeResponse | null } = {
  token: null,
  at: 0,
  data: null,
};

async function fetchMe(token: string | null, signal?: AbortSignal) {
  const res = await fetch("/api/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
    signal,
  });

  const out = (await res.json().catch(() => null)) as MeResponse | null;
  if (!out || out.ok !== true) {
    return {
      ok: true,
      isLoggedIn: false,
      approved: false,
      role: "member",
      reviewStatus: "pending",
      rejectionReason: null,
      reviewedAt: null,
      user: null,
      error: "bad response",
    } satisfies MeResponse;
  }
  return out;
}

async function loadMe(signal: AbortSignal) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  const dataMe = await fetchMe(token, signal);
  cached = { token, at: Date.now(), data: dataMe };
  return dataMe;
}

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(cached.data);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().finally(() => {
      if (alive) setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") setAuthReady(true);
      cached = { token: null, at: 0, data: null };
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Fetches /api/me, cancelling any request still in flight. Sets no state, so
  // the effect below can apply the result from promise callbacks.
  const start = () => {
    inflight.current?.abort();
    const ac = new AbortController();
    inflight.current = ac;
    return loadMe(ac.signal);
  };

  const refresh = async () => {
    if (!authReady) return;
    setLoading(true);
    try {
      const dataMe = await start();
      setMe(dataMe);
      return dataMe;
    } catch (e: unknown) {
      if (isAbortError(e)) return;
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // `loading` starts true, so the first load only has to clear it.
  useEffect(() => {
    if (!authReady) return;
    start()
      .then(setMe, (e: unknown) => {
        if (!isAbortError(e)) throw e;
      })
      .finally(() => setLoading(false));
  }, [authReady]);

  const isAdmin = useMemo(
    () => !!me?.isLoggedIn && me.approved === true && me.role === "admin",
    [me],
  );

  return { me, loading: !authReady || loading, isAdmin, refresh };
}
