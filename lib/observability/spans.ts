import * as Sentry from "@sentry/nextjs";

import { redactTelemetry } from "./redaction";

export type SafeSpanAttributes = Record<string, string | number | boolean | undefined>;

export async function withObservedSpan<T>(
  name: string,
  operation: string,
  attributes: SafeSpanAttributes,
  work: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    { name, op: operation, attributes: redactTelemetry(attributes) as SafeSpanAttributes },
    work,
  );
}

export function captureSafeException(error: unknown, context: Record<string, unknown> = {}): void {
  Sentry.captureException(error, { extra: redactTelemetry(context) as Record<string, unknown> });
}
