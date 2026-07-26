import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

// Inter per docs/02-BRANDING_SEO.md §7 ("reads like enterprise software").
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "COI Tracking Software for Property Managers — CertShield",
    template: "%s · CertShield",
  },
  description:
    "AI reads vendor insurance certificates, flags gaps, and chases renewals automatically. Never work with an uninsured vendor again. From $99/mo.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
        {/* Vercel built-ins — fail-soft: no-op locally / when blocked by ad-blockers. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
