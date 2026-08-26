import { Mail, MapPin, Phone } from "lucide-react";
import { contactInfo } from "@/lib/homeData";
import { getLocale } from "@/lib/i18n";

export default async function ContactPage() {
  const locale = await getLocale();
  const en = locale === "en";
  const address = en
    ? "658-91 Haemaji-ro, Seosaeng-myeon, Ulju-gun, Ulsan 45014, Republic of Korea"
    : contactInfo.address;

  return (
    <main className="min-h-screen bg-[#F6F7F9]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-6 md:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Contact</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950 md:text-4xl">{en ? "Contact" : "문의"}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-[15px]">
            {en ? "For inquiries, partnerships, or cooperation proposals related to INC, please use the contact information below." : "INC 관련 문의, 제휴 및 협력 제안은 아래 연락처를 이용해 주세요."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10 md:px-6 md:py-14">
        <div className="grid border border-slate-200 bg-white md:grid-cols-3">
          <div className="border-b border-slate-200 p-6 md:border-b-0 md:border-r">
            <MapPin className="h-5 w-5 text-[#174A7E]" />
            <div className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Address</div>
            <div className="mt-2 text-sm leading-7 text-slate-700">{address}</div>
          </div>

          <div className="border-b border-slate-200 p-6 md:border-b-0 md:border-r">
            <Phone className="h-5 w-5 text-[#174A7E]" />
            <div className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Telephone</div>
            <a href={`tel:${contactInfo.phone.replace(/[^0-9+]/g, "")}`} className="mt-2 inline-block text-sm font-semibold text-slate-800 transition hover:text-[#174A7E]">
              {contactInfo.phone}
            </a>
          </div>

          <div className="p-6">
            <Mail className="h-5 w-5 text-[#174A7E]" />
            <div className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Email</div>
            <a href={`mailto:${contactInfo.email}`} className="mt-2 inline-block break-all text-sm font-semibold text-slate-800 transition hover:text-[#174A7E]">
              {contactInfo.email}
            </a>
          </div>
        </div>

        <div className="mt-6 border-l-2 border-[#174A7E] bg-white px-5 py-4 text-sm leading-6 text-slate-500">
          {en
            ? "For questions about a specific resource or post, include the resource title or page URL so we can identify it more quickly."
            : "자료 이용이나 게시물 관련 문의 시 해당 자료명 또는 페이지 주소를 함께 보내주시면 확인이 더 빠릅니다."}
        </div>
      </section>
    </main>
  );
}
