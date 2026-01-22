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
        <Footer policyLinks={policyLinks} orgName="INC" />
      </body>
    </html>
  );
}
