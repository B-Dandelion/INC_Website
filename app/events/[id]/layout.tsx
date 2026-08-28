import type { Metadata } from "next";
import { fetchPromotionEventById } from "@/lib/promotionalEventsDb";
import { descriptionFromText, makeMetadata, NOINDEX_METADATA } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await fetchPromotionEventById(id);
  if (!event) return NOINDEX_METADATA;

  const source = event.summary_ko ?? event.topic_ko ?? event.content_ko;

  return makeMetadata({
    title: event.title_ko,
    description: descriptionFromText(
      source,
      `INC 이벤트: ${event.title_ko}`,
    ),
    path: `/events/${event.id}`,
    type: "article",
  });
}

export default function EventDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
