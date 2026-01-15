// lib/resourceAdapters.ts
import type { ResourceItem } from "@/components/resources/ResourceList";

type RawItem = {
  id: string | number;
  title: string;
  displayname?: string | null;
  note?: string | null;
  kind: string;
  href?: string;
  date?: string;
};

export function toResourceItems(
  raw: RawItem[],
  boardSlug: string,
  boardTitle: string,
): ResourceItem[] {
  return raw.map((x) => ({
    id: x.id,
    title: x.title,
    displayname: (x.displayname ?? x.note ?? null),
    kind: x.kind,
    href: x.href,

    date: x.date ?? "2025-01-01",
    visibility: "public",
    canView: true,
    canDownload: false,

    boardSlug,
    boardTitle,
    originalFilename: "",
  }));
}