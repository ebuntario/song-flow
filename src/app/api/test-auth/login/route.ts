import { db } from "@/lib/db";
import { users, accounts, sessions } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

/**
 * Test-only authentication endpoint.
 * Creates a mock user session for E2E testing.
 * 
 * IMPORTANT: Only works when TEST_MODE=true or NODE_ENV=test
 */
export async function POST(request: Request) {
  // Security check - only allow in test mode
  if (process.env.TEST_MODE !== "true" && process.env.NODE_ENV !== "test") {
    return NextResponse.json(
      { error: "Test endpoint not available in production" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const testUsername = body.username ?? "test_user";

    // Create or get test user
    const testUserId = `test-user-${testUsername}`;
    const existingUser = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: testUserId,
        name: `Test User (${testUsername})`,
        email: `${testUsername}@test.local`,
        image: null,
      });
    }

    // Create session token
    const sessionToken = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing sessions for this test user
    await db.delete(sessions).where(eq(sessions.userId, testUserId));

    // Create new session
    await db.insert(sessions).values({
      sessionToken,
      userId: testUserId,
      expires,
    });

    // Create mock TikTok account if it doesn't exist
    const existingAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, testUserId))
      .limit(1);

    if (existingAccount.length === 0) {
      await db.insert(accounts).values({
        userId: testUserId,
        type: "oauth",
        provider: "tiktok",
        providerAccountId: `tiktok-${testUserId}`,
        access_token: "test-tiktok-token",
        refresh_token: "test-tiktok-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Bearer",
        scope: "user.info.basic",
      });
    }

    // Set the session cookie in response
    const response = NextResponse.json({
      success: true,
      userId: testUserId,
      sessionToken,
      expires: expires.toISOString(),
    });

    // Set NextAuth session cookie
    response.cookies.set("authjs.session-token", sessionToken, {
      expires,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("Test login error:", error);
    return NextResponse.json(
      { error: "Failed to create test session" },
      { status: 500 }
    );
  }
}

/**
 * Clean up test sessions
 */
export async function DELETE() {
  if (process.env.TEST_MODE !== "true" && process.env.NODE_ENV !== "test") {
    return NextResponse.json(
      { error: "Test endpoint not available in production" },
      { status: 403 }
    );
  }

  try {
    // Delete all test user sessions
    const result = await db.delete(sessions).where(
      eq(sessions.userId, "test-user-test_user")
    );

    return NextResponse.json({ success: true, message: "Test sessions cleaned up" });
  } catch (error) {
    console.error("Test cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to clean up test sessions" },
      { status: 500 }
    );
  }
}
