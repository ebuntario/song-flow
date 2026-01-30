/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mark better-sqlite3 as external to prevent bundling issues on Vercel
  // In production, we use Neon PostgreSQL instead
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  
  // Allow external images from OAuth providers
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.spotifycdn.com" },
      { protocol: "https", hostname: "i.scdn.co" },
    ],
  },
};

export default nextConfig;
