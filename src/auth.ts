import NextAuth from "next-auth";
import TikTok from "next-auth/providers/tiktok";
import Spotify from "next-auth/providers/spotify";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
});
