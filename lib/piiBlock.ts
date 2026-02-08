// lib/piiBlock.ts
const PII_PATTERNS = [
  /passport/i, /여권/, /통장/, /신분증/, /외국인/, /residence\s*card/i,
  /bank/i, /account/i, /voided/i, /송금/, /영수증/, /학번/, /주소/, /등록증/,
];

export function isSensitiveFilename(name: string) {
  return PII_PATTERNS.some((re) => re.test(name || ""));
}