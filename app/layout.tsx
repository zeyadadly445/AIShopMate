import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI ShopMate - شات بوت ذكي للتجار",
  description: "منصة شات بوت ذكية تساعد التجار في التواصل مع عملائهم تلقائياً. احصل على رابط مخصص لمتجرك واتصل بعملائك عبر ذكاء اصطناعي متطور.",
  keywords: "شات بوت, ذكاء اصطناعي, تجارة إلكترونية, سوشيال ميديا, خدمة عملاء",
  authors: [{ name: "AI ShopMate Team" }],
  openGraph: {
    title: "AI ShopMate - شات بوت ذكي للتجار",
    description: "منصة شات بوت ذكية للتواصل مع العملاء تلقائياً",
    type: "website",
    locale: "ar_EG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
