import NextAuth from "next-auth";
import TikTok from "next-auth/providers/tiktok";
import Spotify from "next-auth/providers/spotify";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema-pg";
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
      // user.info.basic: open_id, avatar_url, display_name (included in Login Kit)
      // user.info.profile: username, bio_description, is_verified, etc. (added in TikTok Dev Portal)
      authorization: {
        params: {
          scope: "user.info.basic,user.info.profile",
        },
      },
      // Request username (requires user.info.profile) alongside the basic fields
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
        const tiktokProfile = profile as {
          data?: { user?: { username?: string; display_name?: string; avatar_url?: string } }
        };
        const tiktokUser = tiktokProfile.data?.user;
        // Prefer @username; fall back to display_name if user.info.profile isn't returning it yet
        const username = tiktokUser?.username || tiktokUser?.display_name;
        // Only write avatar_url if the API actually returned one — never fall back to the
        // previous (possibly expired) user.image value
        const avatarUrl = tiktokUser?.avatar_url;

        const updateData: Partial<typeof users.$inferInsert> = {};
        if (username) updateData.tiktokUsername = username;
        if (avatarUrl) updateData.image = avatarUrl;

        if (Object.keys(updateData).length > 0) {
          try {
            await db.update(users).set(updateData).where(eq(users.id, user.id));
            logger.info("Updated TikTok profile data", {
              component: "auth", userId: user.id, username, hasAvatar: !!avatarUrl,
            });
          } catch (err) {
            // Log but don't block sign-in — stale profile data is better than no login
            logger.error("Failed to update TikTok profile data", {
              component: "auth", userId: user.id, error: err,
            });
          }
        }
      }
      
      return true;
    },
    async session({ session, user }) {
      logger.debug("Auth session callback", { component: "auth", userId: user?.id });
      session.user.id = user.id;
      // User type is augmented in types/next-auth.d.ts — safe to access directly
      session.user.tiktokUsername = user.tiktokUsername;
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
