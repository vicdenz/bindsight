import * as Sentry from "@sentry/nextjs";

import { beforeSendRedacted } from "@/lib/observability/redaction";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 1,
  sendDefaultPii: false,
  enableLogs: true,
  beforeSend: beforeSendRedacted,
});
