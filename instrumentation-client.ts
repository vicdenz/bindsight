import * as Sentry from "@sentry/nextjs";

import { beforeSendRedacted } from "@/lib/observability/redaction";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  beforeSend: beforeSendRedacted,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
