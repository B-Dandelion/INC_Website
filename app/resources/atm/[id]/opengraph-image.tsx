import { publicationShareImage, shareImageSize } from "@/lib/publicationShareImage";

export const size = shareImageSize;
export const contentType = "image/png";
export const alt = "INC publication";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  return publicationShareImage("atm", (await params).id);
}
