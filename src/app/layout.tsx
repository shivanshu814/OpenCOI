import { Toaster } from "@/components/ui/sonner";
import { ogImageUrl } from "@/lib/seo/metadata";
import { ORG, SITE_URL, VERIFICATION, absoluteUrl } from "@/lib/seo/site";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
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

const DEFAULT_TITLE = "COI Tracking Software for Property Managers — CertShield";
const DEFAULT_DESCRIPTION =
  "AI reads vendor insurance certificates, flags gaps, and chases renewals automatically. Never work with an uninsured vendor again. From $99/mo.";

/**
 * Site-wide metadata defaults.
 *
 * `metadataBase` is the important addition and was previously missing: without
 * it, every relative OG image and canonical Next generates resolves against
 * `localhost:3000` in development and against the per-DEPLOYMENT `*.vercel.app`
 * host on preview builds — which is exactly how a preview URL ends up published
 * as the canonical of a production page. Individual pages still set their own
 * canonical through `pageMetadata()`; this is only the base they resolve
 * against.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · CertShield",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: ORG.name,
  authors: [{ name: ORG.name, url: SITE_URL }],
  creator: ORG.name,
  publisher: ORG.name,
  category: "business software",
  // No explicit `icons` here — Next 16 auto-generates <link rel="icon"> and
  // <link rel="apple-touch-icon"> from src/app/icon.png and apple-icon.png.
  // Setting them here would DOUBLE-emit tags and the raster PNG wins on
  // browser + iOS quality anyway.
  // Safari turns bare digit runs into phone links on iOS, which mangles policy
  // numbers, NAIC codes and coverage limits across every document surface.
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: ORG.name,
    locale: "en_US",
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: absoluteUrl(ogImageUrl(ORG.tagline)),
        width: 1200,
        height: 630,
        alt: ORG.tagline,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl(ogImageUrl(ORG.tagline))],
  },
  verification: {
    ...(VERIFICATION.google ? { google: VERIFICATION.google } : {}),
    ...(VERIFICATION.bing
      ? { other: { "msvalidate.01": VERIFICATION.bing } }
      : {}),
  },
  alternates: {
    types: {
      "application/rss+xml": [
        { url: absoluteUrl("/blog/rss.xml"), title: "CertShield blog" },
      ],
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#182b45",
  colorScheme: "light",
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
