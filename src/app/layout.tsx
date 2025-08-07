import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "uwGuessr",
  description: "A UWaterloo guessing game!",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="uwGuessr" />
        
        {/* Open Graph */}
        <meta property="og:title" content="uwGuessr" />
        <meta property="og:description" content="A UWaterloo guessing game!" />
        <meta property="og:image" content="https://uwguessr.com/preview.png" />
        <meta property="og:url" content="https://uwguessr.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="uwGuessr" />
        <meta name="twitter:description" content="A UWaterloo guessing game!" />
        <meta name="twitter:image" content="https://uwguessr.com/preview.png" />

        {/* Microsoft Tile */}
        <meta name="msapplication-TileColor" content="#ffc40d" />
        <meta name="msapplication-TileImage" content="/apple-touch-icon.png" />

        {/* Manifest for PWA */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
