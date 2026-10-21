import { publicationShareImage, shareImageSize } from "@/lib/publicationShareImage";

export const size = shareImageSize;
export const contentType = "image/png";
// Render once per issue and serve the stored PNG afterwards (refreshed daily).
export const revalidate = 86400;
export const alt = "INC publication";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  return publicationShareImage("atm", (await params).id);
}
