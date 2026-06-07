import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ??
  "https://merupaca--merupaca.asia-east1.hosted.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "メルパカ — AIがあなたの文体でメール返信を下書き",
    template: "%s | メルパカ",
  },
  description:
    "受信メール本文を貼り付けるだけ。AIがあなたの文体で返信案を2つ作ります。中小企業の社長・個人事業主のためのメール返信秘書。",
  keywords: [
    "メール返信",
    "AI",
    "メール 下書き",
    "中小企業",
    "個人事業主",
    "社長",
    "ビジネスメール",
    "返信 例文",
  ],
  applicationName: "メルパカ",
  openGraph: {
    siteName: "メルパカ",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
