import { fetchEvents } from "@/lib/eventsDb";
import { getLocale } from "@/lib/i18n";
import { EventList } from "@/components/resources/events/EventParts";
import StandardEventBoard from "@/components/resources/events/StandardEventBoard";

export default async function SeminarsPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string; event?: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;
  const sub = sp.sub === "domestic" ? "domestic" : "international";

  const events = await fetchEvents({ category: "seminar", subtype: sub });
  const selectedId = (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;

  const submenu = (
    <EventList
      events={events}
      selectedId={selectedId}
      href={(id) => `/resources/seminar?sub=${sub}&event=${id}`}
      en={en}
      emptyText={en ? "No seminars are registered." : "등록된 세미나가 없습니다."}
      switcher={[
        { label: en ? "Domestic" : "국내", href: "/resources/seminar?sub=domestic", active: sub === "domestic" },
        { label: en ? "International" : "국제", href: "/resources/seminar?sub=international", active: sub === "international" },
      ]}
    />
  );

  return (
    <StandardEventBoard
      activeKey="seminar"
      board={en ? (sub === "domestic" ? "Domestic Seminars" : "International Seminars") : sub === "domestic" ? "국내 세미나" : "국제 세미나"}
      events={events}
      selectedId={selectedId}
      submenu={submenu}
      en={en}
    />
  );
}
