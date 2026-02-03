import { auth } from "@/auth";
import { db } from "@/lib/db";
import { liveSessions, queueItems } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/queue - Get queue for active session
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get active session
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
      return NextResponse.json({ queue: [], hasSession: false });
    }

    // Get queue items
    const queue = await db
      .select()
      .from(queueItems)
      .where(
        and(
          eq(queueItems.liveSessionId, activeSession.id),
          eq(queueItems.status, "queued")
        )
      )
      .orderBy(queueItems.position);

    return NextResponse.json({
      queue,
      hasSession: true,
      sessionId: activeSession.id,
    });
  } catch (error) {
    logger.error("Error fetching queue", { component: "queue-api", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/queue?id=xxx - Remove an item from the queue
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("id");

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Get the queue item and verify ownership
    const [item] = await db
      .select({
        item: queueItems,
        session: liveSessions,
      })
      .from(queueItems)
      .innerJoin(liveSessions, eq(queueItems.liveSessionId, liveSessions.id))
      .where(eq(queueItems.id, itemId))
      .limit(1);

    if (!item || item.session.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // Mark as skipped/removed
    await db
      .update(queueItems)
      .set({ status: "skipped" })
      .where(eq(queueItems.id, itemId));

    return NextResponse.json({
      success: true,
      message: "Item removed from queue",
    });
  } catch (error) {
    logger.error("Error removing from queue", { component: "queue-api", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to remove from queue" },
      { status: 500 }
    );
  }
}
