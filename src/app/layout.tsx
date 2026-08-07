import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { clerkAppearance } from "@/lib/clerk-appearance";
import {
  AUTH_AFTER_SIGN_IN_URL,
  AUTH_AFTER_SIGN_OUT_URL,
  AUTH_SIGN_IN_URL,
  AUTH_SIGN_UP_URL,
} from "@/lib/auth-routes";
import { BRAND_DEFAULT } from "@/lib/brand";
import { ServiceWorkerRegistration } from "@/components/platform/ServiceWorkerRegistration";
import "./globals.css";
import "./clerk-overrides.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
    { media: "(prefers-color-scheme: light)", color: "#020617" },
  ],
  colorScheme: "dark",
};

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
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: BRAND_DEFAULT.icon, type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
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
      signInUrl={AUTH_SIGN_IN_URL}
      signUpUrl={AUTH_SIGN_UP_URL}
      signInForceRedirectUrl={AUTH_AFTER_SIGN_IN_URL}
      signUpForceRedirectUrl={AUTH_AFTER_SIGN_IN_URL}
      signInFallbackRedirectUrl={AUTH_AFTER_SIGN_IN_URL}
      signUpFallbackRedirectUrl={AUTH_AFTER_SIGN_IN_URL}
      afterSignOutUrl={AUTH_AFTER_SIGN_OUT_URL}
      touchSession
      taskUrls={{
        "setup-mfa": AUTH_AFTER_SIGN_IN_URL,
        "reset-password": AUTH_SIGN_IN_URL,
      }}
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
