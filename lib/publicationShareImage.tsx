// lib/publicationShareImage.tsx
// The preview card shown when an issue link is shared (KakaoTalk, LinkedIn,
// Slack...): publication name, issue title, date and the issue's headlines.
import { ImageResponse } from "next/og";
import { PUBLICATIONS, cut, fetchIssue, readIssueContent, type PublicationSlug } from "@/lib/publications";

export const shareImageSize = { width: 1200, height: 630 };

// Load only the glyphs this card uses from Google Fonts. Korean fonts are
// large, and the default font has no Hangul at all.
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`, { cache: "force-cache" })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url, { cache: "force-cache" })).arrayBuffer();
  } catch {
    return null;
  }
}

export async function publicationShareImage(slug: PublicationSlug, idParam: string) {
  const pub = PUBLICATIONS[slug];
  const id = Number(idParam);
  const found = Number.isInteger(id) && id > 0 ? await fetchIssue(slug, id) : null;
  const content = found?.issue.r2_key ? await readIssueContent(slug, found.issue.r2_key) : null;

  const title = found?.issue.title ?? pub.name;
  const date = found?.issue.published_at ?? "";
  let lines: string[] = [];
  if (content?.kind === "atm") lines = content.atm.items.map((it) => cut(it.title, 58));
  if (content?.kind === "heartbeat") {
    const col = content.heartbeat.column;
    lines = [col?.title ? `“${cut(col.title, 50)}”` : null, ...content.heartbeat.toc.slice(0, 3).map((s) => cut(s.title, 50))].filter(
      (x): x is string => Boolean(x),
    );
  }
  lines = lines.slice(0, 3);

  const text = [pub.name, pub.taglineKo, title, date, ...lines, "INC International Nuclear Cooperation"].join(" ");
  const font = await loadFont(text);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0b2440 0%, #174A7E 100%)",
          color: "white",
          fontFamily: font ? "Noto Sans KR" : undefined,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, opacity: 0.75, letterSpacing: 2 }}>{`${pub.name} · ${pub.taglineKo}`}</div>
          <div style={{ fontSize: 54, marginTop: 18, lineHeight: 1.15 }}>{cut(title, 48)}</div>
          {date ? <div style={{ fontSize: 26, marginTop: 12, opacity: 0.8 }}>{date}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: "flex", fontSize: 28, lineHeight: 1.3 }}>
              <span style={{ opacity: 0.6, marginRight: 14 }}>{i + 1}</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 22, opacity: 0.7 }}>INC · International Nuclear Cooperation</div>
      </div>
    ),
    {
      ...shareImageSize,
      fonts: font ? [{ name: "Noto Sans KR", data: font, weight: 700, style: "normal" }] : undefined,
    },
  );
}
