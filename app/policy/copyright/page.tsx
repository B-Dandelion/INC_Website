import PageShell from "@/components/PageShell";
import { getLocale } from "@/lib/i18n";

const sectionClass = "border-t border-slate-200 pt-6";
const titleClass = "text-base font-semibold text-slate-900";
const bodyClass = "mt-3 text-sm leading-7 text-slate-600";

export default async function CopyrightPolicyPage() {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <PageShell
      title={en ? "Copyright Policy" : "저작권정책"}
      description={
        en
          ? "Guidelines for using content and materials provided through the INC website."
          : "INC 웹사이트에서 제공하는 콘텐츠와 자료의 이용 기준을 안내합니다."
      }
    >
      <div className="grid gap-7">
        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "1. Ownership of content" : "1. 콘텐츠의 권리"}</h2>
          <p className={bodyClass}>
            {en
              ? "Copyright and other intellectual property rights in content created by INC belong to INC or the relevant rights holder. Materials created by third parties remain subject to the rights and usage conditions of their respective rights holders."
              : "INC가 직접 제작한 콘텐츠의 저작권 및 기타 지식재산권은 INC 또는 해당 권리자에게 있습니다. 외부 기관·저자가 제작한 자료는 각 권리자의 권리와 이용조건이 우선 적용됩니다."}
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "2. Use of published materials" : "2. 게시 자료의 이용"}</h2>
          <div className={bodyClass}>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{en ? "Materials may be viewed or downloaded within the scope permitted on each page or file." : "자료는 각 페이지 또는 파일에서 허용된 범위 내에서 열람하거나 내려받을 수 있습니다."}</li>
              <li>{en ? "When quoting or referring to material, clearly indicate the source and do not alter the meaning of the original content." : "자료를 인용하거나 참고하는 경우 출처를 명확히 표시하고 원문의 의미가 왜곡되지 않도록 해야 합니다."}</li>
              <li>{en ? "Commercial redistribution, unauthorized modification, or use that may misrepresent INC endorsement requires prior permission from the relevant rights holder." : "상업적 재배포, 무단 수정, 또는 INC가 특정 내용을 보증하는 것처럼 오인될 수 있는 이용은 해당 권리자의 사전 허가가 필요합니다."}</li>
            </ul>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "3. Third-party content" : "3. 외부 저작물"}</h2>
          <p className={bodyClass}>
            {en
              ? "The website may contain reports, images, videos, presentation materials, or links supplied by external authors or organizations. Permission to view such content on this website does not automatically grant permission for separate reproduction or redistribution."
              : "본 웹사이트에는 외부 저자·기관이 제공한 보고서, 이미지, 영상, 발표자료 또는 링크가 포함될 수 있습니다. 웹사이트에서 열람할 수 있다는 사실만으로 별도의 복제·재배포 권한까지 부여되는 것은 아닙니다."}
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "4. Logos and marks" : "4. 로고 및 표장"}</h2>
          <p className={bodyClass}>
            {en
              ? "INC names, logos, and other marks displayed on the website may be protected separately from general website content and should not be used in a way that implies affiliation or endorsement without permission."
              : "웹사이트에 표시된 INC 명칭, 로고 및 기타 표장은 일반 콘텐츠와 별도로 보호될 수 있으며, 허가 없이 제휴·후원 관계를 오인하게 하는 방식으로 사용할 수 없습니다."}
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={titleClass}>{en ? "5. Copyright inquiries" : "5. 저작권 관련 문의"}</h2>
          <p className={bodyClass}>
            {en ? "For permission requests or questions about a specific item, contact " : "특정 자료의 이용 허가 또는 권리 관련 문의는 "}
            <a className="font-semibold text-[#174A7E] hover:underline" href="mailto:inc@kings.ac.kr">inc@kings.ac.kr</a>
            {en ? "." : "로 보내주세요."}
          </p>
        </section>
      </div>
    </PageShell>
  );
}
