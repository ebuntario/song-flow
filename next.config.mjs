/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mark better-sqlite3 as external to prevent bundling issues
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
  
  // Proxy WebSocket and backend API to Elysia backend service
  // In production on Railway, uses internal networking
  // In local dev, proxies to localhost:4000
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:4000";
    return [
      {
        source: "/ws/:path*",
        destination: `${backendUrl}/ws/:path*`,
      },
      {
        source: "/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
