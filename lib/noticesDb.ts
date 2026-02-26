// lib/noticesDb.ts
import { createSupabaseServerClient } from "./supabaseServer";

export type NoticeRow = {
  id: number;
  title: string;
  content: string;
  posted_at: string; // date string
  pinned: boolean;
  created_at: string;
};

export async function fetchNotices(args?: { page?: number; pageSize?: number }) {
  const supabase = createSupabaseServerClient();
  const page = Math.max(1, args?.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, args?.pageSize ?? 30));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("notices")
    .select("id,title,content,posted_at,pinned,created_at")
    .eq("visibility", "public")
    .order("pinned", { ascending: false })
    .order("posted_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return (data ?? []) as NoticeRow[];
}

export async function fetchNoticeById(id: number) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notices")
    .select("id,title,content,posted_at,pinned,created_at")
    .eq("visibility", "public")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as NoticeRow | null;
}