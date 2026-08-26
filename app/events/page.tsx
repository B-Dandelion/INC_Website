import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { fetchPromotionEvents } from "@/lib/promotionalEventsDb";

export const dynamic = "force-dynamic";

function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function periodLabel(start?: string | null, end?: string | null) {
  if (!start) return "일정 미정";
  return end && end !== start ? `${start} ~ ${end}` : start;
}

function eventEnd(start?: string | null, end?: string | null) {
  return end ?? start ?? "9999-12-31";
}

function EventList({ events, ended }: { events: Awaited<ReturnType<typeof fetchPromotionEvents>>; ended: boolean }) {
  if (events.length === 0) return null;

  return (
    <div className="border border-slate-200 bg-white">
      {events.map((event, index) => (
        <Link
          key={event.id}
          href={`/events/${event.id}`}
          className={`group grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center ${
            index !== events.length - 1 ? "border-b border-slate-100" : ""
          }`}
        >
          <div>
            <span
              className={`inline-flex border px-2 py-1 text-[11px] font-bold ${
                ended
                  ? "border-slate-200 bg-slate-50 text-slate-500"
                  : "border-[#BDD2E6] bg-[#EEF4FA] text-[#174A7E]"
              }`}
            >
              {ended ? "종료" : "진행 · 예정"}
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-xs tabular-nums text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              {periodLabel(event.event_date, event.period_end)}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-6 text-slate-900 transition group-hover:text-[#174A7E] md:text-base">
              {event.title_ko}
            </h3>
            {event.summary_ko ? (
              <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-500">{event.summary_ko}</p>
            ) : null}
            {event.location_ko ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                {event.location_ko}
              </div>
            ) : null}
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#174A7E]">
            자세히
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function EventsPage() {
  const events = await fetchPromotionEvents();
  const today = todayInKorea();

  const upcoming = events
    .filter((event) => eventEnd(event.event_date, event.period_end) >= today)
    .sort((a, b) => (a.event_date ?? "9999-12-31").localeCompare(b.event_date ?? "9999-12-31"));

  const past = events
    .filter((event) => eventEnd(event.event_date, event.period_end) < today)
    .sort((a, b) => eventEnd(b.event_date, b.period_end).localeCompare(eventEnd(a.event_date, a.period_end)));

  return (
    <main className="min-h-screen bg-[#F6F7F9]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-6 md:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">INC Events</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950 md:text-4xl">행사 · 이벤트</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-[15px]">
            INC에서 진행하거나 안내하는 주요 행사와 참여 정보를 확인할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-14">
        {events.length === 0 ? (
          <div className="border border-slate-200 bg-white px-5 py-14 text-center text-sm text-slate-400">
            등록된 이벤트가 없습니다.
          </div>
        ) : (
          <div className="space-y-12">
            {upcoming.length > 0 ? (
              <section>
                <div className="mb-4 flex items-end justify-between border-b border-slate-300 pb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">진행 · 예정 이벤트</h2>
                    <p className="mt-1 text-sm text-slate-500">가까운 일정부터 표시합니다.</p>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-slate-400">{upcoming.length}건</span>
                </div>
                <EventList events={upcoming} ended={false} />
              </section>
            ) : null}

            {past.length > 0 ? (
              <section>
                <div className="mb-4 flex items-end justify-between border-b border-slate-300 pb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">지난 이벤트</h2>
                    <p className="mt-1 text-sm text-slate-500">최근 종료된 행사부터 표시합니다.</p>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-slate-400">{past.length}건</span>
                </div>
                <EventList events={past} ended />
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
