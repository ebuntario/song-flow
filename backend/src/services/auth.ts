import { getUserFromSessionToken } from "../db/queries";
import type { User } from "../db/schema";

/**
 * Parse session token from cookie header
 */
function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    // NextAuth v5 uses "authjs.session-token"
    if (cookie.startsWith("authjs.session-token=")) {
      return decodeURIComponent(cookie.slice("authjs.session-token=".length));
    }
    // Fallback for encrypted sessions
    if (cookie.startsWith("__Secure-authjs.session-token=")) {
      return decodeURIComponent(cookie.slice("__Secure-authjs.session-token=".length));
    }
  }

  return null;
}

/**
 * Validate request and return user
 */
export async function validateRequest(cookieHeader: string | null): Promise<User | null> {
  const sessionToken = parseSessionCookie(cookieHeader);
  if (!sessionToken) return null;

  return getUserFromSessionToken(sessionToken);
}

/**
 * Auth guard for Elysia routes
 */
export function createAuthGuard() {
  return async ({ cookie, set }: { cookie: Record<string, { value: string }>; set: { status: number } }) => {
    // Reconstruct cookie header from Elysia cookie object
    const cookieHeader = Object.entries(cookie)
      .map(([name, { value }]) => `${name}=${value}`)
      .join("; ");

    const user = await validateRequest(cookieHeader);

    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    return { user };
  };
}
