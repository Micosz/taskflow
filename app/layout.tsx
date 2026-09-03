import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { translations } from "@/i18n/translations";

import "./globals.css";

const defaultMessages = translations.en;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${defaultMessages.app.name} — ${defaultMessages.app.tagline}`,
    template: `%s · ${defaultMessages.app.name}`,
  },
  description: defaultMessages.app.productDescription,
  applicationName: defaultMessages.app.name,
  creator: defaultMessages.app.name,
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: defaultMessages.app.name,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/taskflow-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/taskflow-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/taskflow-apple.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "dark",
  themeColor: "#080916",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
