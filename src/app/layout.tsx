import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ContentWrapper } from "@/components/dashboard/content-wrapper";
import { SessionProvider } from "@/components/providers/session-provider";
import { AIChatWrapper } from "@/components/ai-chat";
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
        <SessionProvider>
          <Sidebar />
          <ContentWrapper>
            {children}
          </ContentWrapper>
          <AIChatWrapper />
        </SessionProvider>
      </body>
    </html>
  );
}
