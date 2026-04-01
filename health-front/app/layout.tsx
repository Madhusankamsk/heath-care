import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CompanyBrandingSync } from "@/components/layout/CompanyBrandingSync";
import { AppToaster } from "@/components/ui/AppToaster";

const appSans = Plus_Jakarta_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Health Scan",
  description: "Healthcare operations dashboard",
  applicationName: "Health Scan",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    const key = "health_front_theme";
    const saved = localStorage.getItem(key);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch {}
})();`,
          }}
        />
      </head>
      <body
        className={`${appSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <CompanyBrandingSync />
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
