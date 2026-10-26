function r2RemotePattern() {
  const raw = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return {
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const remotePatterns = [
  { protocol: "https", hostname: "images.unsplash.com" },
  // Legacy Cloudflare Images delivery for existing records only.
  { protocol: "https", hostname: "imagedelivery.net" },
];

const r2Pattern = r2RemotePattern();
if (r2Pattern) remotePatterns.push(r2Pattern);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns,
  },
  // Keep the Postgres driver outside the bundler.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
