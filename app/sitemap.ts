import type { MetadataRoute } from "next";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

type SitemapEntry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  priority: number,
  changeFrequency: SitemapEntry["changeFrequency"],
  lastModified?: string,
): SitemapEntry {
  return {
    url: absoluteUrl(path),
    priority,
    changeFrequency,
    ...(lastModified ? { lastModified } : {}),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    entry("/", 1, "weekly"),
    entry("/about", 0.85, "monthly"),
    entry("/resources", 0.9, "weekly"),
    entry("/notice", 0.85, "daily"),
    entry("/events", 0.85, "daily"),
    entry("/contact", 0.55, "monthly"),
    entry("/policy/privacy", 0.3, "yearly"),
    entry("/policy/copyright", 0.3, "yearly"),
    entry("/policy/email", 0.3, "yearly"),
    ...RESOURCE_BOARDS.map((board) =>
      entry(`/resources/${board.slug}`, 0.75, "weekly"),
    ),
  ];

  try {
    const supabase = createSupabaseServerClient();
    const [noticeResult, eventResult] = await Promise.all([
      supabase
        .from("notices")
        .select("id,updated_at")
        .eq("visibility", "public")
        .order("id", { ascending: false }),
      supabase
        .from("events")
        .select("id,updated_at")
        .eq("category", "promotion")
        .eq("visibility", "public")
        .order("event_date", { ascending: false, nullsFirst: false }),
    ]);

    if (!noticeResult.error) {
      for (const row of noticeResult.data ?? []) {
        routes.push(entry(`/notice/${row.id}`, 0.7, "monthly", row.updated_at ?? undefined));
      }
    }

    if (!eventResult.error) {
      for (const row of eventResult.data ?? []) {
        routes.push(entry(`/events/${row.id}`, 0.7, "monthly", row.updated_at ?? undefined));
      }
    }
  } catch {
    // 정적 경로만으로도 유효한 sitemap을 반환한다.
  }

  return routes;
}
