import { createSupabaseServerClient } from "./supabaseServer";

export type DbResource = {
  id: number;
  title: string;
  kind: string;
  note: string | null;
  published_at: string | null;
  visibility: "public" | "member" | "admin";
  r2_key: string | null;
  boards: { slug: string }[] | null;
};

export async function fetchPublicResources(limit = 50) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("resources")
    .select(
      `
      id, title, kind, note, published_at, visibility, r2_key,
      boards ( slug )
    `,
    )
    .eq("visibility", "public")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<DbResource[]>();

  if (error) return [];
  return data ?? [];
}
