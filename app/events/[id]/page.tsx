import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { fetchPromotionEventById } from "@/lib/promotionalEventsDb";
import { getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function periodLabel(start: string | null | undefined, end: string | null | undefined, en: boolean) {
  if (!start) return en ? "Schedule TBD" : "일정 미정";
  return end && end !== start ? `${start} ~ ${end}` : start;
}

function timeLabel(start?: string | null, end?: string | null) {
  if (!start) return null;
  return end ? `${start.slice(0, 5)} ~ ${end.slice(0, 5)}` : start.slice(0, 5);
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const { id } = await params;
  const event = await fetchPromotionEventById(id);

  if (!event) notFound();

  const time = timeLabel(event.start_time, event.end_time);
  const hasContact = Boolean(event.contact_name || event.contact_email || event.contact_phone);

  return (
    <main className="min-h-screen bg-[#F6F7F9]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-10 md:px-6 md:py-14">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-[#174A7E]"
          >
            <ArrowLeft className="h-4 w-4" />
            {en ? "Event list" : "이벤트 목록"}
          </Link>

          <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">INC Event</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 md:text-5xl">
            {event.title_ko}
          </h1>
          {event.summary_ko ? (
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">{event.summary_ko}</p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:grid-cols-[minmax(0,1fr)_280px] md:px-6 md:py-14">
        <article className="min-w-0">
          {event.content_ko ? (
            <div className="border-t border-slate-300 pt-6">
              <h2 className="text-lg font-semibold text-slate-900">{en ? "Event Information" : "행사 안내"}</h2>
              <div className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-slate-700">{event.content_ko}</div>
            </div>
          ) : event.topic_ko ? (
            <div className="border-t border-slate-300 pt-6">
              <h2 className="text-lg font-semibold text-slate-900">{en ? "Highlights" : "주요 내용"}</h2>
              <div className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-slate-700">{event.topic_ko}</div>
            </div>
          ) : (
            <div className="border-t border-slate-300 pt-6 text-sm text-slate-400">
              {en ? "Detailed information is being prepared." : "상세 안내가 준비 중입니다."}
            </div>
          )}

          {event.audience_ko ? (
            <div className="mt-10 border-t border-slate-200 pt-6">
              <h2 className="text-base font-semibold text-slate-900">{en ? "Audience" : "참여 대상"}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{event.audience_ko}</p>
            </div>
          ) : null}

          {hasContact ? (
            <div className="mt-10 border-t border-slate-200 pt-6">
              <h2 className="text-base font-semibold text-slate-900">{en ? "Contact" : "문의"}</h2>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                {event.contact_name ? (
                  <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" />{event.contact_name}</div>
                ) : null}
                {event.contact_email ? (
                  <a className="flex items-center gap-2 hover:text-[#174A7E]" href={`mailto:${event.contact_email}`}>
                    <Mail className="h-4 w-4 text-slate-400" />{event.contact_email}
                  </a>
                ) : null}
                {event.contact_phone ? (
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{event.contact_phone}</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </article>

        <aside>
          <div className="border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">{en ? "Event Details" : "행사 정보"}</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{en ? "Date" : "일정"}</dt>
                <dd className="mt-1.5 leading-6 text-slate-700">{periodLabel(event.event_date, event.period_end, en)}</dd>
              </div>
              {time ? (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Clock3 className="h-3.5 w-3.5" />{en ? "Time" : "시간"}</dt>
                  <dd className="mt-1.5 leading-6 text-slate-700">{time}</dd>
                </div>
              ) : null}
              {event.location_ko ? (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><MapPin className="h-3.5 w-3.5" />{en ? "Location" : "장소"}</dt>
                  <dd className="mt-1.5 leading-6 text-slate-700">{event.location_ko}</dd>
                </div>
              ) : null}
            </dl>

            {event.cta_url ? (
              <a
                href={event.cta_url}
                target={event.cta_url.startsWith("http") ? "_blank" : undefined}
                rel={event.cta_url.startsWith("http") ? "noreferrer" : undefined}
                className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#174A7E] px-4 text-sm font-bold text-white transition hover:bg-[#103A66]"
              >
                {event.cta_label || (en ? "Learn more" : "자세히 보기")}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
