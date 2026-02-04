import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteSettingsProvider } from "@/lib/contexts/SiteSettingsContext";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agara Köyü - Sosyal Ağ",
  description: "Agara Köyü sakinleri için sosyal paylaşım platformu",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/android/android-launchericon-96-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/android/android-launchericon-192-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/ios/180.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Agara Köyü",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
          <ServiceWorkerRegistration />
          {children}
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
