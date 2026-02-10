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
            addressLines: ["울산광역시", "울주군 서생면 해맞이로 658-91, 45014"],
            phone: "052-712-7345",
            email: "inc@kings.ac.kr",
          }}
        />
      </body>
    </html>
  );
}
export const metadata = {
  icons: {
    icon: "/inc_logo_mini.png",
  },
};