import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: {
    default: "COI Tracking Software for Property Managers — CertShield",
    template: "%s · CertShield",
  },
  description:
    "AI reads vendor insurance certificates, flags gaps, and chases renewals automatically. Never work with an uninsured vendor again. From $99/mo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
