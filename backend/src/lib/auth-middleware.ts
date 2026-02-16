import { Elysia } from "elysia";
import { validateRequest } from "../services/auth";
import { getActiveSessionForUser } from "../db/queries";
import type { User, LiveSession } from "../db/schema";

/**
 * Elysia derive plugin that extracts auth + active session from cookies.
 *
 * Replaces the duplicated cookie-parse → validateRequest → getActiveSession
 * pattern that was repeated in every endpoint.
 *
 * Usage:
 *   app.use(authDerive).get("/foo", ({ user, activeSession }) => { ... })
 *
 * - `user` is null if unauthenticated
 * - `activeSession` is null if no active live session (or unauthenticated)
 */
export const authDerive = new Elysia({ name: "auth" }).derive(
  async ({ cookie }): Promise<{ user: User | null; activeSession: LiveSession | null }> => {
    const cookieHeader = Object.entries(cookie)
      .map(([name, c]) => `${name}=${c.value}`)
      .join("; ");

    const user = await validateRequest(cookieHeader);
    if (!user) {
      return { user: null, activeSession: null };
    }

    const activeSession = await getActiveSessionForUser(user.id);
    return { user, activeSession };
  }
);
