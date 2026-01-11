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

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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

  async function fetchAndSetRole(u: User | null) {
    if (!u) {
      setIsAdmin(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", u.id)
      .single();

    if (error) {
      setIsAdmin(false);
      return;
    }

    setIsAdmin(data?.role === "admin");
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
        await fetchAndSetRole(nextUser);
      } catch (err: any) {
        if (!alive) return;
        if (err?.name === "AbortError") return;
        setUser(null);
        setIsAdmin(false);
      } finally {
        if (alive) setLoading(false);
      }
    };

    sync();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      await fetchAndSetRole(nextUser);
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!user) {
        if (alive) setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!alive) return;

      if (error) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(data?.role === "admin");
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  async function signOut() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
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

  return (
    <div className="inline-flex items-center gap-2">
      <details ref={detailsRef} className="relative">
        <summary className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 hover:bg-gray-50 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-gray-700 max-w-[140px] truncate">
            {displayName}
          </span>
          <span className="text-gray-400 text-xs">▾</span>
        </summary>

        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
          {isAdmin && (
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