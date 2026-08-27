"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut, Shield } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n";

const supabase = supabaseBrowser();

type ProfileRow = { role: string | null; approved: boolean | null };

const controlClass =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50";

export default function AuthButton({ locale = "ko" }: { locale?: Locale }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const en = locale === "en";

  const router = useRouter();
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const loginHref = useMemo(
    () => `/login?next=${encodeURIComponent(pathname || "/")}`,
    [pathname],
  );

  const displayName = useMemo(() => {
    const email = user?.email ?? "";
    if (email.includes("@")) return email.split("@")[0];
    return user?.user_metadata?.name || (en ? "account" : "계정");
  }, [user, en]);

  function closeMenu() {
    detailsRef.current?.removeAttribute("open");
  }

  async function fetchAndSetProfile(u: User | null) {
    if (!u) {
      setIsAdmin(false);
      setApproved(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role, approved")
      .eq("id", u.id)
      .single();

    if (error || !data) {
      setIsAdmin(false);
      setApproved(null);
      return;
    }

    const p = data as ProfileRow;
    setIsAdmin(p.role === "admin");
    setApproved(Boolean(p.approved));
  }

  useEffect(() => {
    let alive = true;

    const sync = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!alive) return;

        const nextUser = error ? null : (data.user ?? null);
        setUser(nextUser);
        await fetchAndSetProfile(nextUser);
      } catch (err: any) {
        if (!alive) return;
        if (err?.name === "AbortError") return;
        setUser(null);
        setIsAdmin(false);
        setApproved(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    sync();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      await fetchAndSetProfile(nextUser);
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("inc_login_at");
      localStorage.removeItem("inc_last_at");
      try {
        new BroadcastChannel("inc-auth").postMessage({ type: "logout" });
      } catch {}
      setUser(null);
      setIsAdmin(false);
      setApproved(null);
      closeMenu();
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <button className={`${controlClass} cursor-not-allowed text-slate-400`} disabled>
        {en ? "Log in" : "로그인"}
      </button>
    );
  }

  if (!user) {
    return (
      <Link href={loginHref} className={controlClass}>
        <LogIn className="h-4 w-4" />
        {en ? "Log in" : "로그인"}
      </Link>
    );
  }

  const isPending = approved === false;

  return (
    <div className="inline-flex items-center gap-2">
      <details ref={detailsRef} className="relative">
        <summary className={`${controlClass} cursor-pointer select-none [&::-webkit-details-marker]:hidden`}>
          <Shield className="h-4 w-4 text-[#174A7E]" />
          <span className="max-w-[140px] truncate">{displayName}</span>
          {isPending ? (
            <span className="ml-1 border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
              {en ? "Pending" : "승인대기"}
            </span>
          ) : null}
          <span className="text-xs text-slate-400">▾</span>
        </summary>

        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
          {isPending ? (
            <Link
              href="/pending"
              onClick={closeMenu}
              className="block border-b border-slate-100 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              {en ? "Approval status" : "승인 대기 안내"}
            </Link>
          ) : null}

          {!isPending && isAdmin ? (
            <Link
              href="/admin/upload"
              onClick={closeMenu}
              className="block border-b border-slate-100 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              {en ? "Upload resources" : "자료 업로드"}
            </Link>
          ) : null}

          <button
            onClick={signOut}
            className="inline-flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            {en ? "Log out" : "로그아웃"}
          </button>
        </div>
      </details>
    </div>
  );
}
