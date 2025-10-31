import type { Metadata } from "next";
import localFont from "next/font/local"
import "./globals.css";

export const metadata: Metadata = {
  title: "미니 프로젝트 랭킹 시스템",
  description: "순천향대학교 사물인터넷학과 머신러닝 미니 프로젝트 랭킹 시스템",
};

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="ko" className={`${pretendard.variable}`}>
        <body>
          {children}
        </body>
      </html>
  );
}
