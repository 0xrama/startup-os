type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type LogContext = Record<string, unknown>;
type LogLevel = "info" | "warn" | "error";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(secret|token|password|authorization|cookie|key|pin|ciphertext|access)/i;

function serializeError(error: Error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack ?? null,
  };
}

export function redactLogData(value: unknown): JsonValue {
  if (value instanceof Error) {
    return serializeError(value);
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactLogData(entry));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as LogContext).map(
      ([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactLogData(nestedValue),
      ]
    );

    return Object.fromEntries(entries) as JsonValue;
  }

  return String(value);
}

function writeStructuredLog(
  level: LogLevel,
  message: string,
  context: LogContext
) {
  const consoleApi = globalThis.console as Console;
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
