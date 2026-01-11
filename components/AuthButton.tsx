"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient, type User } from "@supabase/supabase-js";
import { LogIn, LogOut, Shield } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!alive) return;

        if (error) setUser(null);
        else setUser(data.user ?? null);
      } catch (err: any) {
        if (!alive) return;
        if (err?.name === "AbortError") return;
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  async function signOut() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
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
  
  const displayName =
  (user?.email ? user.email.split("@")[0] : "") ||
  user?.user_metadata?.name ||
  "account";

  return (
    <div className="inline-flex items-center gap-2">
      <Shield className="w-4 h-4 text-blue-600" />
      <span className="text-sm text-gray-700 max-w-[140px] truncate">
        {displayName}
      </span>
      <button
        onClick={signOut}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 hover:bg-gray-50"
      >
        <LogOut className="w-4 h-4" />
        로그아웃
      </button>
    </div>
  );
}