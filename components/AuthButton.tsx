"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { LogIn, LogOut, ChevronDown, Shield } from "lucide-react";

type Profile = {
  role: "public" | "member" | "admin";
  approved: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AuthButton() {
  const router = useRouter();
  const pathname = usePathname();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!url || !anon) return null;
    return createClient(url, anon);
  }, [url, anon]);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  async function loadProfile(userId: string) {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("role, approved")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
    else setProfile(null);
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      const u = data.session?.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? null });
        await loadProfile(u.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? null });
        await loadProfile(u.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
      router.refresh();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const nextParam = encodeURIComponent(pathname || "/");

  async function onSignOut() {
    if (!supabase) return;
    setLoading(true);
    setOpen(false);
    await supabase.auth.signOut();
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  if (!url || !anon) {
    return (
      <Link
        href={`/login?next=${nextParam}`}
        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <LogIn className="h-4 w-4" />
        로그인
      </Link>
    );
  }

  if (loading) {
    return <div className="h-9 w-24 rounded-full bg-gray-100" />;
  }

  if (!user) {
    return (
      <Link
        href={`/login?next=${nextParam}`}
        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <LogIn className="h-4 w-4" />
        로그인
      </Link>
    );
  }

  const label = user.email ? user.email.split("@")[0] : "Account";
  const isAdmin = profile?.role === "admin";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
          "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        )}
      >
        <span className="max-w-[120px] truncate">{label}</span>
        {isAdmin && <Shield className="h-4 w-4 text-blue-600" />}
        <ChevronDown className={cx("h-4 w-4 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="px-3 py-2 text-xs text-gray-500">
            {profile ? (
              <>
                권한:{" "}
                <span className="font-medium text-gray-800">
                  {profile.role}
                  {profile.role === "member" && (profile.approved ? " (approved)" : " (pending)")}
                </span>
              </>
            ) : (
              "권한 정보 없음"
            )}
          </div>

          <div className="h-px bg-gray-100" />

          {isAdmin && (
            <>
              <Link
                href="/admin/upload"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                관리자 업로드
              </Link>
              <div className="h-px bg-gray-100" />
            </>
          )}

          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
