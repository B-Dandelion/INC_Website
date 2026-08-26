import PageShell from "@/components/PageShell";
import { getLocale } from "@/lib/i18n";

const sectionClass = "border-t border-slate-200 pt-6";
const titleClass = "text-base font-semibold text-slate-900";
const bodyClass = "mt-3 text-sm leading-7 text-slate-600";

export default async function PrivacyPolicyPage() {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <PageShell
      title={en ? "Privacy Policy" : "개인정보처리방침"}
      description={
        en
          ? "This page explains how personal information is handled when using the INC website."
          : "INC 웹사이트 이용 과정에서 처리되는 개인정보와 이용자 권리를 안내합니다."
      }
    >
      <div className="grid gap-7">
        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "1. Purpose of processing" : "1. 개인정보 처리 목적"}</h2>
          <p className={bodyClass}>
            {en
              ? "INC processes the information submitted through account registration to operate member accounts, review account approval, provide access to member-only resources, and respond to account-related inquiries."
              : "INC는 회원 계정 운영, 가입 승인 확인, 회원 전용 자료 접근 제공 및 계정 관련 문의 대응을 위해 회원가입 시 입력된 정보를 처리합니다."}
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "2. Information processed" : "2. 처리하는 개인정보 항목"}</h2>
          <div className={bodyClass}>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{en ? "Registration information: name, affiliation, phone number, email address" : "회원가입 정보: 이름, 소속 기관, 전화번호, 이메일 주소"}</li>
              <li>{en ? "Authentication information required to sign in is processed through the website authentication service." : "로그인에 필요한 인증 정보는 웹사이트 인증 서비스를 통해 처리됩니다."}</li>
              <li>{en ? "Technical information such as access records may be generated in system logs while the service is used." : "서비스 이용 과정에서 접속기록 등 기술 정보가 시스템 로그에 생성될 수 있습니다."}</li>
            </ul>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "3. Retention and deletion" : "3. 보관 및 삭제"}</h2>
          <p className={bodyClass}>
            {en
              ? "Account information is retained as necessary for account operation. If account information no longer needs to be retained, or if deletion is requested and there is no legal reason to retain it, the information should be deleted in accordance with the applicable operating policy and law. Requests regarding personal information can be sent to the contact address below."
              : "회원정보는 계정 운영에 필요한 범위에서 보관됩니다. 정보 보관 필요가 없어지거나 이용자가 삭제를 요청하고 별도의 법적 보관 사유가 없는 경우에는 운영정책 및 관계 법령에 따라 삭제 대상이 됩니다. 개인정보 관련 요청은 아래 연락처로 접수할 수 있습니다."}
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "4. Service infrastructure" : "4. 서비스 운영 인프라"}</h2>
          <p className={bodyClass}>
            {en
              ? "The website uses external cloud services for technical operation, including Supabase for authentication and database functions, Vercel for web hosting and deployment, and Cloudflare R2 for file storage. Information required for each function may be technically processed by these services as part of providing the website."
              : "본 웹사이트는 기술적 운영을 위해 외부 클라우드 서비스를 사용합니다. 인증 및 데이터베이스 기능에는 Supabase, 웹 호스팅 및 배포에는 Vercel, 자료 파일 저장에는 Cloudflare R2가 사용되며, 웹사이트 제공에 필요한 정보가 각 서비스에서 기술적으로 처리될 수 있습니다."}
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "5. User rights" : "5. 이용자의 권리"}</h2>
          <p className={bodyClass}>
            {en
              ? "Users may contact INC to request confirmation, correction, or deletion of account information. Requests may require identity verification when necessary to protect account information."
              : "이용자는 본인 계정정보에 대한 확인, 정정 또는 삭제를 요청할 수 있습니다. 계정정보 보호를 위해 필요한 경우 본인 확인 절차가 요구될 수 있습니다."}
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "6. Contact" : "6. 개인정보 관련 문의"}</h2>
          <p className={bodyClass}>
            {en ? "For privacy-related requests or questions, please contact INC at " : "개인정보 관련 요청이나 문의는 INC 대표 이메일 "}
            <a className="font-semibold text-[#174A7E] hover:underline" href="mailto:inc@kings.ac.kr">inc@kings.ac.kr</a>
            {en ? "." : "로 보내주세요."}
          </p>
        </section>

        <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
          {en
            ? "This policy may be updated when website functions or operating policies change."
            : "웹사이트 기능 또는 운영정책이 변경되는 경우 본 방침의 내용도 함께 변경될 수 있습니다."}
        </div>
      </div>
    </PageShell>
  );
}
