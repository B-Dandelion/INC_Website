"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient, type User } from "@supabase/supabase-js";
import { LogIn, LogOut, Shield } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type ProfileRow = { role: string | null; approved: boolean | null };

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null); // null=모름(로딩/미조회)
  const [loading, setLoading] = useState(true);

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
    return user?.user_metadata?.name || "account";
  }, [user]);

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
      } catch { }
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
      <button
        className="px-4 py-2 rounded-full border border-gray-200 text-gray-400"
        disabled
      >
        로그인
      </button>
    );
  }

  if (!user) {
    return (
      <Link
        href={loginHref}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50"
      >
        <LogIn className="w-4 h-4" />
        로그인
      </Link>
    );
  }

  // 로그인은 됐는데 승인 대기인 상태
  const isPending = approved === false;

  return (
    <div className="inline-flex items-center gap-2">
      <details ref={detailsRef} className="relative">
        <summary className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 hover:bg-gray-50 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-gray-700 max-w-[140px] truncate">
            {displayName}
          </span>

          {isPending && (
            <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200">
              승인대기
            </span>
          )}

          <span className="text-gray-400 text-xs">▾</span>
        </summary>

        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
          {isPending && (
            <Link
              href="/pending"
              onClick={closeMenu}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              승인 대기 안내
            </Link>
          )}

          {!isPending && isAdmin && (
            <Link
              href="/admin/upload"
              onClick={closeMenu}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              자료 업로드
            </Link>
          )}

          <button
            onClick={signOut}

            className="w-full text-left inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </details>
    </div>
  );
}
