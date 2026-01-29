import Link from "next/link";
import { isAdminServer } from "@/lib/adminAuth";

export default async function AdminUploadButton({ defaultCategory }: { defaultCategory: string }) {
  const ok = await isAdminServer();
  if (!ok) return null;

  return (
    <Link
      href={`/admin/resources/upload?cat=${encodeURIComponent(defaultCategory)}`}
      className="inline-flex rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#1D4ED8]"
    >
      업로드
    </Link>
  );
}