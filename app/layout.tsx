import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "Nook — 나만의 작은 노션",
  description: "개인 업무를 기록하는 나만의 작은 공간. 로그인, 글 작성·수정·삭제까지.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#191919",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // data-theme="dark" is the SSR default; the inline script flips it to
  // "light" before paint only when that preference was stored. The script
  // may change the attribute before hydration — hence suppressHydrationWarning.
  return (
    <html
      lang="ko"
      data-theme="dark"
      suppressHydrationWarning
      className={pretendard.variable}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
