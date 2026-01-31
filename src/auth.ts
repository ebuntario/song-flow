import NextAuth from "next-auth";
import TikTok from "next-auth/providers/tiktok";
import Spotify from "next-auth/providers/spotify";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";

// Debug: Log environment variables (redacted for security)
const debugAuth = () => {
  console.log("[auth] Debug Info:");
  console.log("[auth] AUTH_URL:", process.env.AUTH_URL ?? "NOT SET");
  console.log("[auth] NEXTAUTH_URL:", process.env.NEXTAUTH_URL ?? "NOT SET");
  console.log("[auth] AUTH_TRUST_HOST:", process.env.AUTH_TRUST_HOST ?? "NOT SET");
  console.log("[auth] VERCEL_URL:", process.env.VERCEL_URL ?? "NOT SET");
  console.log("[auth] AUTH_SPOTIFY_ID:", process.env.AUTH_SPOTIFY_ID ? "SET (" + process.env.AUTH_SPOTIFY_ID.slice(0, 8) + "...)" : "NOT SET");
  console.log("[auth] AUTH_SPOTIFY_SECRET:", process.env.AUTH_SPOTIFY_SECRET ? "SET (redacted)" : "NOT SET");
  console.log("[auth] AUTH_TIKTOK_ID:", process.env.AUTH_TIKTOK_ID ? "SET (" + process.env.AUTH_TIKTOK_ID.slice(0, 8) + "...)" : "NOT SET");
  console.log("[auth] AUTH_SECRET:", process.env.AUTH_SECRET ? "SET (redacted)" : "NOT SET");
  console.log("[auth] NODE_ENV:", process.env.NODE_ENV);
};

// Run debug on module load
debugAuth();

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true, // Enable debug in all environments to diagnose Spotify issue
  trustHost: true, // Required for Vercel deployments
  adapter: DrizzleAdapter(db),
  providers: [
    TikTok, // Primary login
    Spotify({
      authorization: {
        params: {
          scope: "user-read-playback-state user-modify-playback-state user-read-currently-playing",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("[auth] signIn callback:", { 
        provider: account?.provider,
        userId: user?.id,
        hasProfile: !!profile 
      });
      return true;
    },
    async session({ session, user }) {
      console.log("[auth] session callback:", { userId: user?.id });
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log("[auth] Event: signIn success", { provider: account?.provider, userId: user?.id });
    },
    async signOut(message) {
      console.log("[auth] Event: signOut", message);
    },
    async linkAccount({ user, account }) {
      console.log("[auth] Event: linkAccount", { provider: account?.provider, userId: user?.id });
    },
  },
  logger: {
    error(code, ...message) {
      console.error("[auth][error]", code, JSON.stringify(message, null, 2));
    },
    warn(code, ...message) {
      console.warn("[auth][warn]", code, message);
    },
    debug(code, ...message) {
      console.log("[auth][debug]", code, message);
    },
  },
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
});
