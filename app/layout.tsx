import "./globals.css";
import { policyLinks } from "@/lib/homeData";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SessionGuard from "@/components/SessionGuard";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <SessionGuard />
        <Header />
        {children}
        <Footer
          policyLinks={policyLinks}
          orgName="INC"
          contact={{
            addressLines: ["서울특별시", "(주소 확정 필요)"],
            phone: "02-0000-0000",
            email: "webmaster@example.org",
          }}
        />
      </body>
    </html>
  );
}
export const metadata = {
  icons: {
    icon: "/inc_mini_logo.png",
  },
};