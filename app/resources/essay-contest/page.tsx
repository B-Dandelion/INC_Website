// app/resources/essay-contest/page.tsx
import { fetchEvents, fetchEventAssets, type EventAssetRow } from "@/lib/eventsDb";
import { getLocale } from "@/lib/i18n";
import { EmptyEvent, EventList, EventPage, EventSection, MaterialGrid, PhotoGallery, PosterPair, WinnerCard } from "@/components/resources/events/EventParts";
import { awardRank, norm } from "@/components/resources/events/shared";

const BASE = "/resources/essay-contest";

function isAiStatement(a: EventAssetRow) {
  const t = `${a?.item_title_en ?? ""} ${a?.resources?.title ?? ""} ${a?.resources?.original_filename ?? ""}`.toLowerCase();
  return t.includes("ai statement");
}

// Several files per person are common (PDF + HWP, drafts); keep one: PDF first, then sort order, then oldest.
function pickBetter(cur: EventAssetRow | undefined, next: EventAssetRow): EventAssetRow {
  if (!cur) return next;
  const curIsPdf = (cur?.resources?.original_filename ?? "").toLowerCase().endsWith(".pdf");
  const nextIsPdf = (next?.resources?.original_filename ?? "").toLowerCase().endsWith(".pdf");
  if (curIsPdf !== nextIsPdf) return nextIsPdf ? next : cur;
  const curSort = cur?.sort_order ?? 0;
  const nextSort = next?.sort_order ?? 0;
  if (curSort !== nextSort) return nextSort < curSort ? next : cur;
  return (next?.resources?.id ?? 0) < (cur?.resources?.id ?? 0) ? next : cur;
}

export default async function EssayContestPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;
  const events = await fetchEvents({ category: "essay_contest" });
  const selectedId = (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;
  const event = events.find((e) => e.id === selectedId) ?? null;
  const assets = selectedId ? await fetchEventAssets(selectedId) : [];

  const posterKo = assets.find((a) => a.role === "poster_ko" && a.resources?.id) ?? null;
  const posterEn = assets.find((a) => a.role === "poster_en" && a.resources?.id) ?? null;

  const awardDocByPerson = new Map<string, EventAssetRow>();
  for (const d of assets.filter((a) => a.role === "award_doc")) {
    const key = norm(d.person_en ?? d.person_ko);
    if (!key || isAiStatement(d)) continue;
    awardDocByPerson.set(key, pickBetter(awardDocByPerson.get(key), d));
  }
  const awardDocs = Array.from(awardDocByPerson.values()).sort((a, b) => awardRank(a.award) - awardRank(b.award) || (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const winnerPhotos = assets.filter((a) => a.role === "winner_photo");
  const photoByPerson = new Map<string, EventAssetRow>();
  for (const p of winnerPhotos) {
    const key = norm(p.person_en ?? p.person_ko);
    if (key) photoByPerson.set(key, p);
  }
  const photoFor = (personKey: string) =>
    photoByPerson.get(personKey) ??
    winnerPhotos.find((p) => {
      const pk = norm(p.person_en ?? p.person_ko);
      return pk && (personKey.includes(pk) || pk.includes(personKey));
    }) ??
    null;

  const photos = assets.filter((a) => a.role === "photo" && a.resources?.id);
  const groupPhoto = photos.find((p) => norm(p.person_en) === "all") ?? photos.find((p) => norm(p.resources?.original_filename) === "all.jpg") ?? null;
  const otherPhotos = photos.filter((p) => p !== groupPhoto);

  const winnerNames = new Set(awardDocs.map((d) => norm(d.person_en ?? d.person_ko)));
  const bestByPerson = new Map<string, EventAssetRow>();
  for (const a of assets) {
    if (a.role !== "slide" || !a.resources?.id || isAiStatement(a)) continue;
    const key = norm(a.person_en ?? a.person_ko);
    if (!key || winnerNames.has(key)) continue;
    bestByPerson.set(key, pickBetter(bestByPerson.get(key), a));
  }
  const entries = Array.from(bestByPerson.values()).sort((a, b) =>
    (a.person_en ?? a.person_ko ?? "").toLowerCase().localeCompare((b.person_en ?? b.person_ko ?? "").toLowerCase())
  );

  const tabs = [
    posterKo || posterEn ? { id: "poster", label: en ? "Poster" : "포스터" } : null,
    awardDocs.length ? { id: "winners", label: en ? "Winners" : "수상자" } : null,
    photos.length ? { id: "photo", label: en ? "Photos" : "사진" } : null,
    entries.length ? { id: "materials", label: en ? "Entries" : "응모작" } : null,
  ].filter((t): t is { id: string; label: string } => Boolean(t));

  const facts = [
    awardDocs.length ? (en ? `${awardDocs.length} winners` : `수상 ${awardDocs.length}명`) : null,
    entries.length ? (en ? `${entries.length} other entries` : `응모작 ${entries.length}편`) : null,
  ].filter((f): f is string => Boolean(f));

  const submenu = (
    <EventList events={events} selectedId={selectedId} href={(id) => `${BASE}?event=${id}`} en={en} emptyText={en ? "No contests are registered." : "등록된 행사가 없습니다."} />
  );
  const board = en ? "Essay Contest" : "에세이 경진대회";

  return (
    <EventPage activeKey="essay-contest" board={board} event={event} facts={facts} tabs={tabs} submenu={submenu} en={en}>
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
            <EventSection id="winners" title={en ? "Winners" : "수상자"} count={en ? `${awardDocs.length}` : `${awardDocs.length}명`}>
              <div className="grid gap-3 md:grid-cols-2">
                {awardDocs.map((w) => {
                  const person = (w.person_en ?? w.person_ko ?? "").trim() || (en ? "Winner" : "수상자");
                  return (
                    <WinnerCard
                      key={w.id}
                      award={w.award}
                      person={person}
                      photo={photoFor(norm(person))}
                      entryTitle={(en ? w.item_title_en ?? w.item_title_ko : w.item_title_ko ?? w.item_title_en) ?? null}
                      doc={w}
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
          {entries.length ? (
            <EventSection id="materials" title={en ? "Entries" : "응모작"} count={en ? `${entries.length}` : `${entries.length}편`}>
              <MaterialGrid
                en={en}
                items={entries.map((a) => ({
                  asset: a,
                  title: (a.person_en ?? a.person_ko ?? "").trim() || (en ? "Anonymous" : "익명"),
                  sub: (en ? a.item_title_en ?? a.item_title_ko : a.item_title_ko ?? a.item_title_en) ?? null,
                }))}
              />
            </EventSection>
          ) : null}
        </>
      )}
    </EventPage>
  );
}
