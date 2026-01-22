"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

const LOGIN_AT = "inc_login_at";
const LAST_AT = "inc_last_at";

// 원하는 값으로 조절
const ABS_MS = 7 * 24 * 60 * 60 * 1000; // 로그인 후 최대 7일
const IDLE_MS = 30 * 60 * 1000;         // 유휴 30분
const WRITE_MIN_INTERVAL = 60 * 1000;   // last_at 너무 자주 쓰지 않게 1분 제한

export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const lastWriteRef = useRef(0);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();

    const clearKeys = () => {
      localStorage.removeItem(LOGIN_AT);
      localStorage.removeItem(LAST_AT);
    };

    const redirectToLogin = () => {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/auth/login?next=${next}`);
    };

    const isExpired = () => {
      const now = Date.now();
      const loginAt = Number(localStorage.getItem(LOGIN_AT) || 0);
      const lastAt = Number(localStorage.getItem(LAST_AT) || 0);

      if (!loginAt || !lastAt) return false;
      if (now - loginAt > ABS_MS) return true;
      if (now - lastAt > IDLE_MS) return true;
      return false;
    };

    const touch = () => {
      const now = Date.now();
      if (now - lastWriteRef.current < WRITE_MIN_INTERVAL) return;
      lastWriteRef.current = now;
      localStorage.setItem(LAST_AT, String(now));
    };

    const hardLogout = async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        clearKeys();
        // 다른 탭도 같이 로그아웃
        try {
          bcRef.current?.postMessage({ type: "logout" });
        } catch {}
        redirectToLogin();
      }
    };

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      // 로그인 안 되어 있으면 키 정리만
      if (!session) {
        clearKeys();
        return;
      }

      const now = Date.now();
      if (!localStorage.getItem(LOGIN_AT)) localStorage.setItem(LOGIN_AT, String(now));
      if (!localStorage.getItem(LAST_AT)) localStorage.setItem(LAST_AT, String(now));

      if (isExpired()) {
        await hardLogout();
        return;
      }

      // 활동 이벤트 → idle 연장
      const onActivity = () => touch();

      window.addEventListener("mousemove", onActivity, { passive: true });
      window.addEventListener("scroll", onActivity, { passive: true });
      window.addEventListener("click", onActivity);
      window.addEventListener("keydown", onActivity);

      // 탭 복귀 시 체크
      const onVis = () => {
        if (document.visibilityState === "visible") {
          if (isExpired()) hardLogout();
          else touch();
        }
      };
      document.addEventListener("visibilitychange", onVis);

      // 탭 간 로그아웃 동기화
      try {
        const bc = new BroadcastChannel("inc-auth");
        bcRef.current = bc;
        bc.onmessage = (e) => {
          if (e.data?.type === "logout") hardLogout();
        };
      } catch {}

      // 가만히 둔 탭도 주기적으로 만료 체크
      const t = window.setInterval(() => {
        if (isExpired()) hardLogout();
      }, 30_000);

      return () => {
        window.clearInterval(t);
        window.removeEventListener("mousemove", onActivity);
        window.removeEventListener("scroll", onActivity);
        window.removeEventListener("click", onActivity);
        window.removeEventListener("keydown", onActivity);
        document.removeEventListener("visibilitychange", onVis);
        bcRef.current?.close();
      };
    };

    let cleanup: void | (() => void);
    start().then((c) => (cleanup = c));

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [router, pathname]);

  return null;
}