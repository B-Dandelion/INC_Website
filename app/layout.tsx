import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SessionGuard from "@/components/SessionGuard";
import SiteAnalytics from "@/components/SiteAnalytics";
import { getLocale } from "@/lib/i18n";
import { SITE_FULL_NAME, SITE_NAME, SITE_URL } from "@/lib/seo";

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const naverVerification = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} | ${SITE_FULL_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "INC(International Nuclear Cooperation)의 공식 웹사이트입니다. 원자력 연구와 국제 협력 관련 자료, 공지사항, 행사 정보를 제공합니다.",
  keywords: [
    "INC",
    "International Nuclear Cooperation",
    "국제 원자력 협력",
    "원자력",
    "nuclear cooperation",
    "nuclear research",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_FULL_NAME}`,
    description:
      "원자력 연구와 국제 협력 관련 자료, 공지사항, 행사 정보를 제공하는 INC 공식 웹사이트입니다.",
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} | ${SITE_FULL_NAME}`,
    description:
      "원자력 연구와 국제 협력 관련 자료, 공지사항, 행사 정보를 제공하는 INC 공식 웹사이트입니다.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/inc_logo_mini.png",
  },
  ...(googleVerification || naverVerification
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(naverVerification
            ? { other: { "naver-site-verification": naverVerification } }
            : {}),
        },
      }
    : {}),
};
