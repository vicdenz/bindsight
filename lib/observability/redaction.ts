const SENSITIVE_KEYS = /authorization|cookie|secret|token|api[-_]?key|password|client[-_]?secret/i;
const MAX_STRING_LENGTH = 256;

export function redactTelemetry(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]` : value;
  }
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactTelemetry(item, seen));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      SENSITIVE_KEYS.test(key) ? "[redacted]" : redactTelemetry(nested, seen),
    ]),
  );
}

export function beforeSendRedacted<T extends object>(event: T): T {
  return redactTelemetry(event) as T;
}
