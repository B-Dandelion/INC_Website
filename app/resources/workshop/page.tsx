// app/resources/workshop/page.tsx
import { fetchEvents } from "@/lib/eventsDb";
import { getLocale } from "@/lib/i18n";
import { EventList } from "@/components/resources/events/EventParts";
import StandardEventBoard from "@/components/resources/events/StandardEventBoard";
import { eventBoardMetadata } from "@/lib/eventPages";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  return eventBoardMetadata("workshop", await searchParams);
}


export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;
  const events = await fetchEvents({ category: "workshop" });
  const selectedId = (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;

  return (
    <StandardEventBoard
      activeKey="workshop"
      board={en ? "Workshops" : "워크샵"}
      events={events}
      selectedId={selectedId}
      en={en}
      submenu={
        <EventList
          events={events}
          selectedId={selectedId}
          href={(id) => `/resources/workshop?event=${id}`}
          en={en}
          emptyText={en ? "No workshops are registered." : "등록된 행사가 없습니다."}
        />
      }
    />
  );
}
