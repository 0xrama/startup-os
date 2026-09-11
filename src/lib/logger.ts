import type { JsonValue } from "./json";

/** Values a logger context entry may hold before redaction. */
type LogValue = JsonValue | Error;

/** Structured log context passed to the scoped loggers. */
type LogContext = { [key: string]: LogValue };

type LogLevel = "info" | "warn" | "error";

const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
  /(secret|token|password|authorization|cookie|key|pin|ciphertext|access)/i;

function serializeError(error: Error): JsonValue {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack ?? null,
  };
}

/** Narrow to the plain-object branch of {@link LogValue}; primitives and arrays stay out. */
function isPlainRecord(value: LogValue): value is { [key: string]: JsonValue } {
  if (value === null || Array.isArray(value) || value instanceof Error) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function redactLogValue(value: LogValue): JsonValue {
  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactLogValue(entry));
  }

  if (isPlainRecord(value)) {
    return redactLogData(value);
  }

  return value;
}

export function redactLogData(context: LogContext): {
  [key: string]: JsonValue;
} {
  return Object.fromEntries(
    Object.entries(context).map(([key, nestedValue]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactLogValue(nestedValue),
    ])
  );
}

function writeStructuredLog(
  level: LogLevel,
  message: string,
  context: LogContext
) {
  const consoleApi = globalThis.console;
  const writer = consoleApi[level] ?? consoleApi.info;
  writer.call(
    consoleApi,
    JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...redactLogData(context),
    })
  );
}

export function createLogger(scope: string) {
  return {
    info(message: string, context: LogContext = {}) {
      writeStructuredLog("info", message, { scope, ...context });
    },
    warn(message: string, context: LogContext = {}) {
      writeStructuredLog("warn", message, { scope, ...context });
    },
    error(message: string, context: LogContext = {}) {
      writeStructuredLog("error", message, { scope, ...context });
    },
  };
}
