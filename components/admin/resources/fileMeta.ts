// Guess a title and a date from an upload's file name, so a batch of files
// like "ATM_NO_339_2026_AUG_25.pdf" needs little typing.

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function ymd(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  // Reject dates like 2026-02-31 that Date would silently roll over.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function titleFromFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dateFromFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "");

  // 2026-08-25, 2026.08.25, 2026_08_25, 20260825
  const numeric = base.match(/(?<!\d)(20\d{2})[-._ ]?(0[1-9]|1[0-2])[-._ ]?(0[1-9]|[12]\d|3[01])(?!\d)/);
  if (numeric) {
    const value = ymd(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]));
    if (value) return value;
  }

  // 2026 AUG 25, 2026_Aug_5
  const named = base.match(/(?<!\d)(20\d{2})[-._ ]?([A-Za-z]{3,4})[-._ ]?(\d{1,2})(?!\d)/);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    if (month) {
      const value = ymd(Number(named[1]), month, Number(named[3]));
      if (value) return value;
    }
  }

  return "";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
