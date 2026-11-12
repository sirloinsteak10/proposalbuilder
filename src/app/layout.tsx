import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const SITE_URL = process.env.SITE_URL || "https://proposal.oshombali.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Oshom Proposal Builder",
  description: "Create and export event proposals for Oshom Bali.",
  applicationName: "Oshom Proposal Builder",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Oshom Bali",
    title: "Oshom Proposal Builder",
    description: "Create and export event proposals for Oshom Bali.",
  },
  twitter: { card: "summary_large_image", title: "Oshom Proposal Builder" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
