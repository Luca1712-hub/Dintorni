import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { OneSignalAuthBridge } from "@/components/onesignal-auth-bridge";
import { OneSignalForegroundBridge } from "@/components/onesignal-foreground-bridge";
import { SiteHeader } from "@/components/site-header";
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
  title: "Dintorni MVP",
  description: "Web app richieste e risposte tra acquirenti e negozi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Suspense
          fallback={<div className="h-14 shrink-0 border-b border-border bg-surface" aria-hidden />}
        >
          <SiteHeader />
        </Suspense>
        <OneSignalAuthBridge />
        <OneSignalForegroundBridge />
        {children}
      </body>
    </html>
  );
}
