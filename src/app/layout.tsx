import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { SwMessageHandler } from "@/components/sw-message-handler";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bahandi Burger — Списание",
  description: "Система автоматизации списания на торговых точках Bahandi Burger",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bahandi Burger" },
  icons: {
    icon: "/bahandi-logo-removebg-preview.png",
    apple: "/bahandi-logo-removebg-preview.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#E8651A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full`}>
      <body className="min-h-full bg-background font-sans antialiased">
        {children}
        <SwMessageHandler />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}