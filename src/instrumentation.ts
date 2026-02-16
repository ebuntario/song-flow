/**
 * Next.js Instrumentation Hook
 * Runs once at server startup for validation and global error handling.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("@/lib/logger");

    // 1. Validate required env vars in production
    if (process.env.NODE_ENV === "production") {
      const backendUrl = process.env.BACKEND_INTERNAL_URL;
      if (!backendUrl) {
        logger.error("BACKEND_INTERNAL_URL is not set — proxy rewrites will fail", {
          component: "instrumentation",
        });
      } else {
        try {
          const res = await fetch(`${backendUrl}/health`, {
            signal: AbortSignal.timeout(5000),
          });
          logger.info("Backend health check passed", {
            component: "instrumentation",
            status: res.status,
            backendUrl,
          });
        } catch (err) {
          logger.error("Backend health check failed — backend may be unreachable", {
            component: "instrumentation",
            backendUrl,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // 2. Global error handlers — prevent silent crashes
    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled promise rejection", {
        component: "process",
        error: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });

    process.on("uncaughtException", (err) => {
      logger.error("Uncaught exception", {
        component: "process",
        error: err.message,
        stack: err.stack,
      });
      // Let the process crash — but now we have a structured log of why
      process.exit(1);
    });

    logger.info("Instrumentation registered", { component: "instrumentation" });
  }
}
