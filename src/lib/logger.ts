/**
 * Railway-compatible structured logger for Next.js
 * Outputs JSON logs in production, readable logs in development
 * @see https://docs.railway.com/guides/logs
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === "production";

function log(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "songflow-frontend",
    ...context,
  };

  if (isProduction) {
    // Output single-line JSON for Railway parsing
    console.log(JSON.stringify(entry));
  } else {
    // Readable format for local development
    const prefix = `[${level.toUpperCase()}]`;
    if (context && Object.keys(context).length > 0) {
      console[level === "debug" ? "log" : level](prefix, message, context);
    } else {
      console[level === "debug" ? "log" : level](prefix, message);
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};
