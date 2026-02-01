/**
 * Railway-compatible structured logger
 * Outputs JSON logs with level, message, timestamp and custom attributes
 * @see https://docs.railway.com/guides/logs
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (context: LogContext) => Logger;
}

function createLogger(defaultContext?: LogContext): Logger {
  const log = (level: LogLevel, message: string, context?: LogContext) => {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...defaultContext,
      ...context,
    };
    // Output single-line JSON for Railway parsing
    console.log(JSON.stringify(entry));
  };

  return {
    debug: (message: string, context?: LogContext) => log("debug", message, context),
    info: (message: string, context?: LogContext) => log("info", message, context),
    warn: (message: string, context?: LogContext) => log("warn", message, context),
    error: (message: string, context?: LogContext) => log("error", message, context),
    child: (context: LogContext) => createLogger({ ...defaultContext, ...context }),
  };
}

export const logger = createLogger({ service: "songflow-backend" });
