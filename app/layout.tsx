import "./globals.css";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SessionGuard from "@/components/SessionGuard";
import SiteAnalytics from "@/components/SiteAnalytics";
import { getLocale } from "@/lib/i18n";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const en = locale === "en";

  const policyLinks = en
    ? [
        { label: "Privacy Policy", href: "/policy/privacy" },
        { label: "Copyright Policy", href: "/policy/copyright" },
        { label: "Email Collection Policy", href: "/policy/email" },
        { label: "Directions", href: "/contact" },
      ]
    : [
        { label: "개인정보처리방침", href: "/policy/privacy" },
        { label: "저작권정책", href: "/policy/copyright" },
        { label: "이메일무단수집거부", href: "/policy/email" },
        { label: "오시는 길", href: "/contact" },
      ];

  return (
    <html lang={en ? "en" : "ko"}>
      <body>
        <SessionGuard />
        <Header locale={locale} />
        {children}
        <Footer
          locale={locale}
          policyLinks={policyLinks}
          orgName="INC"
          contact={{
            addressLines: en
              ? ["658-91 Haemaji-ro, Seosaeng-myeon", "Ulju-gun, Ulsan 45014, Republic of Korea"]
              : ["울산광역시", "울주군 서생면 해맞이로 658-91, 45014"],
            phone: "052-712-7345",
            email: "inc@kings.ac.kr",
          }}
        />
        <Analytics />
        <Suspense fallback={null}>
          <SiteAnalytics />
        </Suspense>
      </body>
    </html>
  );
}

export const metadata = {
  title: "INC",
  description: "International Nuclear Cooperation",
  icons: {
    icon: "/inc_logo_mini.png",
  },
};
