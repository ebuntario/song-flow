import NextAuth from "next-auth";
import TikTok from "next-auth/providers/tiktok";
import Spotify from "next-auth/providers/spotify";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// Debug: Log environment variables (redacted for security)
const debugAuth = () => {
  logger.info("Auth configuration", {
    component: "auth",
    AUTH_URL: process.env.AUTH_URL ?? "NOT SET",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "NOT SET",
    VERCEL_URL: process.env.VERCEL_URL ?? "NOT SET",
    AUTH_SPOTIFY_ID: process.env.AUTH_SPOTIFY_ID ? "SET" : "NOT SET",
    AUTH_SPOTIFY_SECRET: process.env.AUTH_SPOTIFY_SECRET ? "SET" : "NOT SET",
    AUTH_TIKTOK_ID: process.env.AUTH_TIKTOK_ID ? "SET" : "NOT SET",
    AUTH_SECRET: process.env.AUTH_SECRET ? "SET" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  });
};

// Run debug on module load
debugAuth();

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true, // Enable debug in all environments to diagnose Spotify issue
  trustHost: true, // Required for Vercel deployments
  adapter: DrizzleAdapter(db),
  providers: [
    TikTok({
      // Default scope is user.info.basic which does NOT include username
      // user.info.profile grants access to the username field
      authorization: {
        params: {
          scope: "user.info.profile",
        },
      },
      // Default userinfo only requests open_id,avatar_url,display_name
      // We need to also request username
      userinfo: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,username",
    }),
    Spotify({
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: "user-read-playback-state user-modify-playback-state user-read-currently-playing",
        },
      },
    }),
  ],
  // Cookie configuration for cross-subdomain auth (hotbun.xyz <-> api.hotbun.xyz)
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-authjs.session-token" 
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // In production, share cookie across all subdomains of hotbun.xyz
        domain: process.env.NODE_ENV === "production" ? ".hotbun.xyz" : undefined,
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      logger.info("Auth signIn callback", { 
        component: "auth",
        provider: account?.provider,
        userId: user?.id,
        hasProfile: !!profile,
      });
      
      // Store TikTok username + refresh avatar URL from profile on every login
      // TikTok CDN avatar URLs are signed & expire, so we must refresh each time
      if (account?.provider === "tiktok" && profile && user?.id) {
        const tiktokProfile = profile as { data?: { user?: { username?: string; avatar_url?: string } } };
        const username = tiktokProfile.data?.user?.username;
        const avatarUrl = tiktokProfile.data?.user?.avatar_url ?? user.image;
        
        const updateData: Record<string, string> = {};
        if (username) updateData.tiktokUsername = username;
        if (avatarUrl) updateData.image = avatarUrl;
        
        if (Object.keys(updateData).length > 0) {
          const { users } = await import("@/lib/db/schema-pg");
          const { eq } = await import("drizzle-orm");
          await db.update(users).set(updateData).where(eq(users.id, user.id));
          logger.info("Updated TikTok profile data", { component: "auth", userId: user.id, username, hasAvatar: !!avatarUrl });
        }
      }
      
      return true;
    },
    async session({ session, user }) {
      logger.debug("Auth session callback", { component: "auth", userId: user?.id });
      session.user.id = user.id;
      // Include tiktokUsername in session
      session.user.tiktokUsername = (user as { tiktokUsername?: string }).tiktokUsername;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      logger.info("Auth signIn event", { component: "auth", provider: account?.provider, userId: user?.id });
    },
    async signOut(message) {
      logger.info("Auth signOut event", { component: "auth", message });
    },
    async linkAccount({ user, account }) {
      logger.info("Auth linkAccount event", { component: "auth", provider: account?.provider, userId: user?.id });
    },
  },
  logger: {
    error(code, ...message) {
      logger.error("Auth error", { component: "auth", code, details: message });
    },
    warn(code, ...message) {
      logger.warn("Auth warning", { component: "auth", code, details: message });
    },
    debug(code, ...message) {
      logger.debug("Auth debug", { component: "auth", code, details: message });
    },
  },
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
});
