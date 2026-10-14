import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Pantaker — Give unwanted things another chance",
    template: "%s · Pantaker",
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: "Pantaker",
    title: "Pantaker — Give unwanted things another chance",
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image" },
};
