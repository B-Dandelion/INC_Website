// lib/adminSession.ts
import crypto from "node:crypto";

const COOKIE_NAME = "admin_session";
const TTL_SECONDS = 60 * 60 * 12;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("Missing ADMIN_SESSION_SECRET");
  return s;
}

export function makeAdminCookieValue() {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const nonce = crypto.randomBytes(12).toString("hex");
  const payload = `${exp}.${nonce}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminCookieValue(value?: string | null) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;

  const payload = `${exp}.${nonce}`;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const adminCookie = { name: COOKIE_NAME, maxAge: TTL_SECONDS };