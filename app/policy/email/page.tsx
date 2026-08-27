import PageShell from "@/components/PageShell";
import { getLocale } from "@/lib/i18n";

const sectionClass = "border-t border-slate-200 pt-6";
const titleClass = "text-base font-semibold text-slate-900";
const bodyClass = "mt-3 text-sm leading-7 text-slate-600";

export default async function EmailPolicyPage() {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <PageShell
      title={en ? "Email Collection Policy" : "이메일무단수집거부"}
      description={
        en
          ? "INC does not permit unauthorized automated collection of email addresses published on this website."
          : "INC는 본 웹사이트에 공개된 이메일 주소의 무단 자동 수집을 허용하지 않습니다."
      }
    >
      <div className="grid gap-7">
        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "Unauthorized collection is prohibited" : "이메일 주소 무단수집 금지"}</h2>
          <p className={bodyClass}>
            {en
              ? "Email addresses displayed on this website may not be collected without permission by email-harvesting programs, bots, crawlers, or other automated technical means."
              : "본 웹사이트에 게시된 이메일 주소를 이메일 수집 프로그램, 봇, 크롤러 또는 그 밖의 자동화된 기술적 수단을 이용하여 허가 없이 수집하는 행위를 금지합니다."}
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "Prohibited use" : "수집한 주소의 부적절한 이용 금지"}</h2>
          <p className={bodyClass}>
            {en
              ? "Email addresses obtained from this website must not be used for unsolicited advertising, bulk messaging, impersonation, phishing, or other purposes that may cause harm to recipients or INC."
              : "본 웹사이트에서 취득한 이메일 주소를 원치 않는 광고성 메시지, 대량 발송, 사칭, 피싱 또는 수신자나 INC에 피해를 줄 수 있는 목적으로 이용해서는 안 됩니다."}
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "Reporting misuse" : "오남용 신고"}</h2>
          <p className={bodyClass}>
            {en ? "If you identify unauthorized collection or misuse of an email address associated with INC, please report it to " : "INC와 관련된 이메일 주소의 무단 수집 또는 오남용을 발견한 경우 "}
            <a className="font-semibold text-[#174A7E] hover:underline" href="mailto:inc@kings.ac.kr">inc@kings.ac.kr</a>
            {en ? "." : "로 알려주세요."}
          </p>
        </section>

        <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
          {en
            ? "Unauthorized collection or misuse of email addresses may result in responsibility under applicable law."
            : "이메일 주소의 무단 수집 또는 오남용은 관계 법령에 따라 책임이 발생할 수 있습니다."}
        </div>
      </div>
    </PageShell>
  );
}
