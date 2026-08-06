import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { BRAND_DEFAULT } from "@/lib/brand";
import { ServiceWorkerRegistration } from "@/components/platform/ServiceWorkerRegistration";
import "./globals.css";
import "./clerk-overrides.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DigitalGate Business Platform",
  description: "CRM, industry apps, and growth tools — client portal",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.digitalgate.com.au",
  ),
  applicationName: "DigitalGate",
  appleWebApp: {
    capable: true,
    title: "DigitalGate",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: BRAND_DEFAULT.icon, type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/login"
      signUpUrl="/signup/account"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" className={`${inter.variable} h-full`}>
        <body className="min-h-full bg-slate-950 font-sans text-slate-100 antialiased">
          {children}
          <ServiceWorkerRegistration />
        </body>
      </html>
    </ClerkProvider>
  );
}
