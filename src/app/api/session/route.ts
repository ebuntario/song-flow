import { auth } from "@/auth";
import { db } from "@/lib/db";
import { liveSessions, queueItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/session - Get current active session
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get active session for user
    const [activeSession] = await db
      .select()
      .from(liveSessions)
      .where(
        and(
          eq(liveSessions.userId, session.user.id),
          eq(liveSessions.status, "active")
        )
      )
      .limit(1);

    if (!activeSession) {
      return NextResponse.json({ session: null });
    }

    // Get queue items for this session
    const queue = await db
      .select()
      .from(queueItems)
      .where(eq(queueItems.liveSessionId, activeSession.id))
      .orderBy(queueItems.position);

    return NextResponse.json({
      session: activeSession,
      queue,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/session - Start a new session
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const tiktokUsername = body.tiktokUsername;

    if (!tiktokUsername) {
      return NextResponse.json(
        { error: "TikTok username is required" },
        { status: 400 }
      );
    }

    // Check for existing active session
    const [existingSession] = await db
      .select()
      .from(liveSessions)
      .where(
        and(
          eq(liveSessions.userId, session.user.id),
          eq(liveSessions.status, "active")
        )
      )
      .limit(1);

    if (existingSession) {
      return NextResponse.json(
        { error: "A session is already active", session: existingSession },
        { status: 409 }
      );
    }

    // Create new session
    const sessionId = crypto.randomUUID();
    await db.insert(liveSessions).values({
      id: sessionId,
      userId: session.user.id,
      tiktokUsername,
      status: "active",
      startedAt: new Date(),
    });

    const [newSession] = await db
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.id, sessionId))
      .limit(1);

    return NextResponse.json({
      success: true,
      session: newSession,
    });
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/session - Stop the active session
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find and end active session
    const [activeSession] = await db
      .select()
      .from(liveSessions)
      .where(
        and(
          eq(liveSessions.userId, session.user.id),
          eq(liveSessions.status, "active")
        )
      )
      .limit(1);

    if (!activeSession) {
      return NextResponse.json(
        { error: "No active session" },
        { status: 404 }
      );
    }

    // Update session status
    await db
      .update(liveSessions)
      .set({
        status: "ended",
        endedAt: new Date(),
      })
      .where(eq(liveSessions.id, activeSession.id));

    return NextResponse.json({
      success: true,
      message: "Session ended",
    });
  } catch (error) {
    console.error("Error stopping session:", error);
    return NextResponse.json(
      { error: "Failed to stop session" },
      { status: 500 }
    );
  }
}
