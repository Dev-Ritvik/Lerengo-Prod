type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function normalizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
    };
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        normalizeValue(entry),
      ]),
    );
  }

  return value;
}

export function logServerEvent(level: LogLevel, event: string, meta?: LogMeta) {
  const payload = {
    event,
    level,
    meta: normalizeValue(meta ?? {}),
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}
