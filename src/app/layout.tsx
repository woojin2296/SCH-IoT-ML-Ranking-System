import type { Metadata } from "next";
import localFont from "next/font/local"
import "./globals.css";

// Todo
// 3. 랭킹 Top 3 강조 스타일 적용하기
// 4. 랭킹 보드에서 순위 변동 표시하기 (▲, ▼)
// 5. 댓글 기능 추가하기

export const metadata: Metadata = {
  title: "미니 프로젝트 랭킹 시스템",
  description: "순천향대학교 사물인터넷학과 머신러닝 미니 프로젝트 랭킹 시스템",
};

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
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