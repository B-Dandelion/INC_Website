// components/resources/events/StandardEventBoard.tsx
// 세미나 · 워크샵 · 과제 보고회: poster(s), schedule, photos and materials.
import { fetchEventAssets, type EventRow } from "@/lib/eventsDb";
import type { ResourceNavKey } from "../ResourcesFrame";
import { EmptyEvent, EventPage, EventSection, MaterialGrid, MediaAsset, PhotoGallery, PosterPair } from "./EventParts";
import { bySortOrder } from "./shared";

export default async function StandardEventBoard({
  activeKey,
  board,
  events,
  selectedId,
  submenu,
  en,
}: {
  activeKey: ResourceNavKey;
  board: string;
  events: EventRow[];
  selectedId: string | null;
  submenu: React.ReactNode;
  en: boolean;
}) {
  const event = events.find((e) => e.id === selectedId) ?? null;
  const assets = selectedId ? await fetchEventAssets(selectedId) : [];
  const posterKo = assets.find((a) => a.role === "poster_ko" && a.resources?.id) ?? null;
  const posterEn = assets.find((a) => a.role === "poster_en" && a.resources?.id) ?? null;
  const timetable = assets.find((a) => a.role === "timetable" && a.resources?.id) ?? null;
  const photos = assets.filter((a) => a.role === "photo" && a.resources?.id).sort(bySortOrder);
  const materials = assets.filter((a) => a.role === "slide" && a.resources?.id).sort(bySortOrder);

  const tabs = [
    posterKo || posterEn ? { id: "poster", label: en ? "Poster" : "포스터" } : null,
    timetable ? { id: "timetable", label: en ? "Schedule" : "시간표" } : null,
    photos.length ? { id: "photo", label: en ? "Photos" : "사진" } : null,
    materials.length ? { id: "materials", label: en ? "Materials" : "발표 자료" } : null,
  ].filter((t): t is { id: string; label: string } => Boolean(t));

  const facts = [
    materials.length ? (en ? `${materials.length} materials` : `발표 자료 ${materials.length}건`) : null,
    photos.length ? (en ? `${photos.length} photos` : `사진 ${photos.length}장`) : null,
  ].filter((f): f is string => Boolean(f));

  return (
    <EventPage activeKey={activeKey} board={board} event={event} facts={facts} tabs={tabs} submenu={submenu} en={en}>
      {!event ? (
        <EmptyEvent>{en ? "No events are registered yet." : "등록된 행사가 없습니다."}</EmptyEvent>
      ) : tabs.length === 0 ? (
        <EmptyEvent>
          <strong className="block text-slate-800">{en ? "No materials are registered for this event." : "이 행사에 등록된 자료가 없습니다."}</strong>
          {en ? "Materials will appear here once they are added." : "자료가 추가되면 이곳에 바로 표시됩니다."}
        </EmptyEvent>
      ) : (
        <>
          {posterKo || posterEn ? (
            <EventSection id="poster" title={en ? "Poster" : "포스터"}>
              <PosterPair ko={posterKo} eng={posterEn} board={event.title_ko} en={en} />
            </EventSection>
          ) : null}
          {timetable ? (
            <EventSection id="timetable" title={en ? "Schedule" : "시간표"}>
              <div className="max-w-[820px]">
                <MediaAsset asset={timetable} label={`${event.title_ko} ${en ? "schedule" : "시간표"}`} en={en} />
              </div>
            </EventSection>
          ) : null}
          {photos.length ? (
            <EventSection id="photo" title={en ? "Photos" : "사진"} count={en ? `${photos.length}` : `${photos.length}장`}>
              <PhotoGallery photos={photos} board={event.title_ko} en={en} />
            </EventSection>
          ) : null}
          {materials.length ? (
            <EventSection id="materials" title={en ? "Materials" : "발표 자료"} count={en ? `${materials.length}` : `${materials.length}건`}>
              <MaterialGrid
                en={en}
                items={materials.map((a, i) => {
                  const r = a.resources!;
                  const person = (en ? a.person_en ?? a.person_ko : a.person_ko ?? a.person_en)?.trim();
                  const title = (a.item_title_ko ?? "").trim() || (r.title ?? "").trim() || person || r.original_filename || `${en ? "Material" : "자료"} ${i + 1}`;
                  return { asset: a, title, sub: person && person !== title ? person : null };
                })}
              />
            </EventSection>
          ) : null}
        </>
      )}
    </EventPage>
  );
}
