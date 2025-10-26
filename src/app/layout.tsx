import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studycube Dashboard",
  description: "Studycube 매출 분석 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
