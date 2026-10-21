// app/resources/shortform-contest/page.tsx
import { fetchEvents, fetchEventAssets, type EventAssetRow } from "@/lib/eventsDb";
import { getLocale } from "@/lib/i18n";
import { EmptyEvent, EventList, EventPage, EventSection, PhotoGallery, PosterPair, VideoEntryCard, WinnerCard } from "@/components/resources/events/EventParts";
import { awardRank, bySortOrder, norm, youtubeVideoId } from "@/components/resources/events/shared";

const BASE = "/resources/shortform-contest";

export default async function ShortformContestPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;
  const events = await fetchEvents({ category: "shortform_contest" });
  const selectedId = (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;
  const event = events.find((e) => e.id === selectedId) ?? null;
  const assets = selectedId ? await fetchEventAssets(selectedId) : [];

  const posterKo = assets.find((a) => a.role === "poster_ko" && a.resources?.id) ?? null;
  const posterEn = assets.find((a) => a.role === "poster_en" && a.resources?.id) ?? null;
  const awardDocs = assets
    .filter((a) => a.role === "award_doc")
    .sort((a, b) => awardRank(a.award) - awardRank(b.award) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const photoByPerson = new Map<string, EventAssetRow>();
  for (const p of assets.filter((a) => a.role === "winner_photo")) {
    const key = norm(p.person_en ?? p.person_ko);
    if (key) photoByPerson.set(key, p);
  }
  const photos = assets.filter((a) => a.role === "photo" && a.resources?.id);
  const groupPhoto = photos.find((p) => norm(p.person_en) === "all") ?? photos.find((p) => norm(p.resources?.original_filename) === "all.jpg") ?? null;
  const otherPhotos = photos.filter((p) => p !== groupPhoto);
  const winnerNames = new Set(awardDocs.map((d) => norm(d.person_en ?? d.person_ko)));
  const submissions = assets
    .filter((a) => a.role === "slide" && a.resources?.id)
    .filter((a) => {
      const key = norm(a.person_en ?? a.person_ko);
      return !key || !winnerNames.has(key);
    })
    .sort(bySortOrder);

  const tabs = [
    posterKo || posterEn ? { id: "poster", label: en ? "Poster" : "포스터" } : null,
    awardDocs.length ? { id: "winners", label: en ? "Winners" : "수상작" } : null,
    photos.length ? { id: "photo", label: en ? "Photos" : "사진" } : null,
    submissions.length ? { id: "materials", label: en ? "Entries" : "응모작" } : null,
  ].filter((t): t is { id: string; label: string } => Boolean(t));

  const facts = [
    awardDocs.length ? (en ? `${awardDocs.length} winners` : `수상작 ${awardDocs.length}편`) : null,
    submissions.length ? (en ? `${submissions.length} other entries` : `응모작 ${submissions.length}편`) : null,
  ].filter((f): f is string => Boolean(f));

  const submenu = (
    <EventList events={events} selectedId={selectedId} href={(id) => `${BASE}?event=${id}`} en={en} emptyText={en ? "No contests are registered." : "등록된 행사가 없습니다."} />
  );
  const board = en ? "Short-form Video Contest" : "숏폼영상 공모전";

  return (
    <EventPage activeKey="shortform-contest" board={board} event={event} facts={facts} tabs={tabs} submenu={submenu} en={en}>
      {!event ? (
        <EmptyEvent>{en ? "No contests are registered yet." : "등록된 행사가 없습니다."}</EmptyEvent>
      ) : tabs.length === 0 ? (
        <EmptyEvent>{en ? "No public materials are registered for this contest." : "이 행사에 등록된 공개 자료가 없습니다."}</EmptyEvent>
      ) : (
        <>
          {posterKo || posterEn ? (
            <EventSection id="poster" title={en ? "Poster" : "포스터"}>
              <PosterPair ko={posterKo} eng={posterEn} board={event.title_ko} en={en} />
            </EventSection>
          ) : null}
          {awardDocs.length ? (
            <EventSection id="winners" title={en ? "Winners" : "수상작"} count={en ? `${awardDocs.length}` : `${awardDocs.length}편`}>
              <div className="grid gap-3 md:grid-cols-2">
                {awardDocs.map((w) => {
                  const person = (w.person_en ?? w.person_ko ?? "").trim() || (en ? "Winner" : "수상자");
                  const source = w.resources?.source_path ?? "";
                  return (
                    <WinnerCard
                      key={w.id}
                      award={w.award}
                      person={person}
                      photo={photoByPerson.get(norm(person)) ?? null}
                      entryTitle={(en ? w.item_title_en ?? w.item_title_ko : w.item_title_ko ?? w.item_title_en) ?? null}
                      doc={w}
                      videoUrl={youtubeVideoId(source) ? source : null}
                      en={en}
                    />
                  );
                })}
              </div>
            </EventSection>
          ) : null}
          {photos.length ? (
            <EventSection id="photo" title={en ? "Photos" : "사진"} count={en ? `${photos.length}` : `${photos.length}장`}>
              <PhotoGallery photos={otherPhotos} group={groupPhoto} board={event.title_ko} en={en} />
            </EventSection>
          ) : null}
          {submissions.length ? (
            <EventSection id="materials" title={en ? "Entries" : "응모작"} count={en ? `${submissions.length}` : `${submissions.length}편`}>
              <div className="grid gap-3 md:grid-cols-2">
                {submissions.map((a) => {
                  const label = (a.resources?.title ?? a.item_title_ko ?? a.item_title_en ?? a.resources?.original_filename ?? "").trim() || (en ? "Entry" : "응모작");
                  return (
                    <VideoEntryCard
                      key={a.id}
                      title={label}
                      person={(a.person_en ?? a.person_ko ?? "").trim() || null}
                      url={a.resources?.source_path}
                      fileId={a.resources!.id}
                      en={en}
                    />
                  );
                })}
              </div>
            </EventSection>
          ) : null}
        </>
      )}
    </EventPage>
  );
}
