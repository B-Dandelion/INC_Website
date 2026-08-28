import type { Metadata } from "next";

export const SITE_URL = "https://inc-kings.vercel.app";
export const SITE_NAME = "INC";
export const SITE_FULL_NAME = "International Nuclear Cooperation";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

function normalizeDescription(value: string, fallback: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return fallback;
  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
}

export function descriptionFromText(value: string | null | undefined, fallback: string) {
  return normalizeDescription(value ?? "", fallback);
}

export function makeMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
}): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonical = path ? absoluteUrl(path) : undefined;

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type,
      ...(canonical ? { url: canonical } : {}),
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
    },
  };
}

export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};
