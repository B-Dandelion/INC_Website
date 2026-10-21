// lib/publicationParse.ts
// Turns the text of ATM and Heartbeat of Atoms PDFs into structured content
// for their web pages. Pure functions (no I/O) so they can be checked against
// sample issues. Every parser has a plain-text fallback: a layout we did not
// expect still yields a readable page instead of an empty one.

export type AtmItem = { title: string; bullets: string[]; url: string | null };
export type AtmIssue = { items: AtmItem[]; fallbackText: string | null };

export type TocSection = { title: string; items: string[] };
export type HeartbeatColumn = { heading: string | null; title: string | null; paragraphs: string[]; signature: string | null };
export type HeartbeatIssue = {
  period: string | null;
  column: HeartbeatColumn | null;
  toc: TocSection[];
  fallbackText: string | null;
};

const HANGUL = /[ㄱ-힣]/;
const TRAILING_PUNCT = /[.,!?"“”'’)\]]+$/u;

// Fragments that end a Korean word and never start one: a line that begins
// with them continues the word from the line above.
const CONTINUES_WORD = /^(니다|습니다|입니다|됩니다|합니다|였|었|았|겠|를|을|는|의|에서|에게|으로|다[.,]|요[.,])/;

const SINGLE_SUFFIX = new Set(["이", "가", "은", "는", "을", "를", "의", "에", "로", "와", "과", "도", "만", "한", "할", "된", "될", "적"]);

export type Vocab = Set<string>;

function clean(word: string) {
  return word.replace(TRAILING_PUNCT, "");
}

// Words that appear inside lines (not at a line edge) in the same document.
// A PDF keeps no trace of whether a line broke at a space or mid-word, so the
// document's own vocabulary decides how to rejoin Korean line breaks.
export function buildVocab(text: string): Vocab {
  const vocab: Vocab = new Set();
  for (const line of text.split(/\r?\n/)) {
    const words = line.trim().split(/\s+/);
    for (let i = 1; i < words.length - 1; i++) vocab.add(clean(words[i]));
  }
  return vocab;
}

function koreanGlue(prev: string, next: string, vocab?: Vocab) {
  const prevWord = prev.split(/\s+/).pop() ?? "";
  const nextWord = next.split(/\s+/)[0] ?? "";
  if (CONTINUES_WORD.test(nextWord)) return "";
  // A lone particle or suffix at the start of a line belongs to the word before it.
  if (SINGLE_SUFFIX.has(nextWord)) return "";
  if (!vocab) return " ";
  if (vocab.has(clean(prevWord + nextWord))) return "";
  const prevKnown = vocab.has(clean(prevWord));
  const nextKnown = vocab.has(clean(nextWord));
  if (!prevKnown && !nextKnown) return ""; // two fragments: one word split in half
  return " ";
}

// PDF lines break wherever the page ran out of width. Rejoin them with a space,
// except where a Korean word was split across lines.
export function joinLines(lines: string[], vocab?: Vocab) {
  let out = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!out) {
      out = line;
      continue;
    }
    const glue = HANGUL.test(out.slice(-1)) && HANGUL.test(line.charAt(0)) ? koreanGlue(out, line, vocab) : " ";
    out = out + glue + line;
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function linesOf(text: string) {
  return text.split(/\r?\n/).map((l) => l.replace(/ /g, " "));
}

function joinParagraphs(text: string, vocab: Vocab, limit = 4000) {
  // Blank lines and long runs ending a sentence start new paragraphs.
  const paras: string[] = [];
  let buf: string[] = [];
  for (const raw of linesOf(text)) {
    const line = raw.trim();
    if (!line) {
      if (buf.length) paras.push(joinLines(buf, vocab));
      buf = [];
      continue;
    }
    buf.push(line);
    if (/[.!?다요]\s*$/.test(line) && joinLines(buf, vocab).length > 120) {
      paras.push(joinLines(buf, vocab));
      buf = [];
    }
  }
  if (buf.length) paras.push(joinLines(buf, vocab));
  const out: string[] = [];
  let total = 0;
  for (const p of paras) {
    if (total > limit) break;
    out.push(p);
    total += p.length;
  }
  return out.join("\n\n") || null;
}

// ---------------------------------------------------------------- ATM

const URL_START = /^※?\s*https?:\/\//i;

export function parseAtm(pageText: string): AtmIssue {
  const lines = linesOf(pageText);
  const vocab = buildVocab(pageText);
  const items: AtmItem[] = [];
  let expected = 1;
  type Draft = { titleLines: string[]; bullets: string[][]; urlParts: string[]; inTitle: boolean; inUrl: boolean };
  let cur: Draft | null = null;

  const flush = () => {
    if (!cur) return;
    items.push({
      title: joinLines(cur.titleLines, vocab),
      bullets: cur.bullets.map((b) => joinLines(b, vocab)).filter(Boolean),
      url: cur.urlParts.length ? cur.urlParts.join("").replace(/\s+/g, "") : null,
    });
    cur = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^(\d{1,2})\.\s*(.+)$/);
    if (head && Number(head[1]) === expected) {
      flush();
      cur = { titleLines: [head[2]], bullets: [], urlParts: [], inTitle: true, inUrl: false };
      expected++;
      continue;
    }
    if (!cur) continue;
    const c: Draft = cur;
    // The first-generation footer ("ATM : At The Metro station ...") ends the list.
    if (/^ATM\s*:/i.test(line)) {
      flush();
      break;
    }
    if (URL_START.test(line)) {
      c.urlParts = [line.replace(/^※\s*/, "")];
      c.inUrl = true;
      c.inTitle = false;
      continue;
    }
    if (c.inUrl && !/\s/.test(line) && !/^[-–•]/.test(line)) {
      c.urlParts.push(line); // URL wrapped onto the next line
      continue;
    }
    c.inUrl = false;
    const bullet = line.match(/^[-–•]\s*(.*)$/);
    if (bullet) {
      c.inTitle = false;
      c.bullets.push([bullet[1]]);
      continue;
    }
    if (c.inTitle) c.titleLines.push(line);
    else if (c.bullets.length) c.bullets[c.bullets.length - 1].push(line);
  }
  flush();

  const good = items.filter((it) => it.title && it.bullets.length);
  if (good.length >= 2) return { items: good, fallbackText: null };
  return { items: [], fallbackText: joinParagraphs(pageText, vocab) };
}

// ---------------------------------------------------------------- Heartbeat

const ROMAN = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\.\s*(.+)$/;
const NUMBERED = /^(\d{1,2})\.\s*(.+)$/;
const SIGNATURE = /(교수|총장|센터장|원장|소장)/;

function columnParagraphs(lines: string[], vocab: Vocab) {
  // The column ends with a short sign-off ("KINGS 원자력산업학과 / 석학교수 황 용 수").
  const trimmed = lines.map((l) => l.trim()).filter(Boolean);
  let sigStart = trimmed.length;
  for (let i = trimmed.length - 1; i >= Math.max(0, trimmed.length - 3); i--) {
    if (trimmed[i].length <= 30 && (SIGNATURE.test(trimmed[i]) || /^KINGS\b/.test(trimmed[i]))) sigStart = i;
  }
  const signature = sigStart < trimmed.length ? trimmed.slice(sigStart).join(" ").replace(/\s{2,}/g, " ") : null;

  const paras: string[] = [];
  let buf: string[] = [];
  for (const line of trimmed.slice(0, sigStart)) {
    buf.push(line);
    // A short line ending a sentence closes a paragraph (the PDF has no blank lines).
    const ends = /[.!?다”"]\s*$/.test(line);
    if (ends && (line.length < 34 || joinLines(buf, vocab).length > 420)) {
      paras.push(joinLines(buf, vocab));
      buf = [];
    }
  }
  if (buf.length) paras.push(joinLines(buf, vocab));
  return { paragraphs: paras.filter(Boolean), signature };
}

function parseColumn(pages: string[], vocab: Vocab): HeartbeatColumn | null {
  const startIdx = pages.findIndex((p) => /번째\s*호에\s*덧붙입니다/.test(p));
  if (startIdx < 0) return null;
  const colPages: string[] = [];
  for (let i = startIdx; i < pages.length && i < startIdx + 4; i++) {
    const firstLine = pages[i].trim().split("\n")[0] ?? "";
    if (i > startIdx && (/^\s*목\s*차/.test(pages[i]) || ROMAN.test(firstLine))) break;
    colPages.push(pages[i]);
  }
  const lines = linesOf(colPages.join("\n"));
  const headingIdx = lines.findIndex((l) => /번째\s*호에\s*덧붙입니다/.test(l));
  const heading = lines[headingIdx]?.trim() ?? null;
  let rest = lines.slice(headingIdx + 1);

  // Optional "- 제목 -" right after the heading, sometimes split over lines.
  let title: string | null = null;
  const firstText = rest.findIndex((l) => l.trim());
  if (firstText >= 0 && /^-/.test(rest[firstText].trim())) {
    const parts: string[] = [];
    let j = firstText;
    for (; j < rest.length && j < firstText + 4; j++) {
      const t = rest[j].trim();
      parts.push(t);
      if (j === firstText && /^-.+-$/.test(t)) break;
      if (j > firstText && /-$/.test(t)) break;
    }
    title = parts.join(" ").replace(/^-\s*/, "").replace(/\s*-$/, "").replace(/\s{2,}/g, " ").trim() || null;
    rest = rest.slice(j + 1);
  }
  // Drop the subscription notice that closes the column.
  rest = rest.filter((l) => !/동향지 구독을 원하시는/.test(l));
  return { heading, title, ...columnParagraphs(rest, vocab) };
}

function parseToc(pages: string[], vocab: Vocab): TocSection[] {
  const startIdx = pages.findIndex((p) => /^\s*목\s*차/.test(p));
  if (startIdx < 0) return [];
  const tocLines: string[] = [];
  for (let i = startIdx; i < pages.length && i < startIdx + 5; i++) {
    const page = pages[i];
    // Body pages carry source links and bullet points; the table of contents has neither.
    if (i > startIdx && (/https?:\/\//.test(page) || /^\s*[l●]\s/m.test(page))) break;
    tocLines.push(...linesOf(page));
  }
  const sections: TocSection[] = [];
  let section: TocSection | null = null;
  let itemBuf: string[] | null = null;
  const flushItem = () => {
    if (section && itemBuf) section.items.push(joinLines(itemBuf, vocab));
    itemBuf = null;
  };
  for (const raw of tocLines) {
    const line = raw.trim();
    if (!line || /^목\s*차$/.test(line)) continue;
    const sec = line.match(ROMAN);
    if (sec) {
      flushItem();
      section = { title: sec[2].trim(), items: [] };
      sections.push(section);
      continue;
    }
    const num = line.match(NUMBERED);
    if (num && section) {
      flushItem();
      itemBuf = [num[2]];
      continue;
    }
    if (itemBuf) itemBuf.push(line);
    else if (section && !section.items.length) section.title = joinLines([section.title, line], vocab);
  }
  flushItem();
  return sections.filter((s) => s.items.length);
}

// Issues without a contents page: list the section headings found in the body.
function sectionsFromBody(pages: string[]): TocSection[] {
  const seen = new Set<string>();
  const out: TocSection[] = [];
  for (const page of pages) {
    for (const raw of linesOf(page)) {
      const m = raw.trim().match(ROMAN);
      if (!m) continue;
      const title = m[2].replace(/\d+\.\s.*$/, "").trim();
      if (title.length < 2 || title.length > 80 || seen.has(m[1])) continue;
      seen.add(m[1]);
      out.push({ title, items: [] });
    }
  }
  return out;
}

const PERIOD = /\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.?\s*\([A-Za-z]+\)\s*~\s*(?:\d{4}\.\s*)?\d{1,2}\.\s*\d{1,2}\.?\s*\([A-Za-z]+\)/g;

export function parseHeartbeat(pages: string[]): HeartbeatIssue {
  const vocab = buildVocab(pages.slice(0, 40).join("\n"));
  const first = (pages[0] ?? "").trim();
  // Some covers repeat an old date range; the last one is the current issue.
  const ranges = first.length < 160 ? first.match(PERIOD) : null;
  const period = ranges?.length ? ranges[ranges.length - 1].replace(/\s+/g, " ") : null;
  const column = parseColumn(pages, vocab);
  let toc = parseToc(pages, vocab);
  if (!toc.length) toc = sectionsFromBody(pages);
  const usable = (column && column.paragraphs.length > 0) || toc.length > 0;
  return {
    period,
    column: column && column.paragraphs.length ? column : null,
    toc,
    fallbackText: usable ? null : joinParagraphs(pages.slice(0, 4).join("\n\n"), vocab, 2500),
  };
}
