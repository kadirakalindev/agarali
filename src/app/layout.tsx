import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteSettingsProvider } from "@/lib/contexts/SiteSettingsContext";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agara Köyü - Sosyal Ağ",
  description: "Agara Köyü sakinleri için sosyal paylaşım platformu",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.className} antialiased`}>
        <SiteSettingsProvider>
          {children}
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
