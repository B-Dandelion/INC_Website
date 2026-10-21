// lib/publicCache.ts
// Public (anonymous) queries are cached for a short time so pages do not
// wait on the database on every request. Admin writes expire the matching
// tags immediately, so edits still show up right away.
import { revalidateTag, unstable_cache } from "next/cache";

export const CACHE_TAGS = {
  resources: "resources",
  boards: "boards",
  notices: "notices",
  events: "events",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

// Short enough that view counts and direct DB edits catch up within a minute.
const PUBLIC_REVALIDATE_SECONDS = 60;

export function cachedPublicQuery<Args extends unknown[], Result>(
  query: (...args: Args) => Promise<Result>,
  key: string,
  tags: CacheTag[],
) {
  return unstable_cache(query, [key], {
    revalidate: PUBLIC_REVALIDATE_SECONDS,
    tags,
  });
}

export function invalidatePublicCache(...tags: CacheTag[]) {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}
