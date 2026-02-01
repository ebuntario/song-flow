/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mark better-sqlite3 as external to prevent bundling issues on Vercel
  // In production, we use Neon PostgreSQL instead
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  
  // Explicitly expose public env vars to ensure they're bundled
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
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
