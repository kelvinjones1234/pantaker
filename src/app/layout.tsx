import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { defaultMetadata } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const brandSerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand-serif",
  display: "swap",
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body className={`${inter.variable} ${brandSerif.variable}`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm">
          Skip to content
        </a>
        <main id="main" className="min-h-[60vh]">
          {children}
        </main>
      </body>
    </html>
  );
}
