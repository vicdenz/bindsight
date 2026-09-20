import "server-only";

import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));

const serverEnvironmentSchema = z.object({
  AI_PROVIDER: z.enum(["openai", "baseten"]).default("openai"),
  FEDERATO_CLIENT_ID: z.string().optional(),
  FEDERATO_CLIENT_SECRET: z.string().optional(),
  FEDERATO_AUTH_URL: optionalUrl,
  FEDERATO_HANDLER_URL: optionalUrl,
  BASETEN_API_KEY: z.string().optional(),
  BASETEN_OPENAI_BASE_URL: optionalUrl,
  BASETEN_FAST_MODEL: z.string().optional(),
  BASETEN_REASONING_MODEL: z.string().optional(),
  BASETEN_COMPILER_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_FAST_MODEL: z.string().default("gpt-5.6-luna"),
  OPENAI_REVIEW_MODEL: z.string().default("gpt-5.6-terra"),
  OPENAI_DEEP_MODEL: z.string().default("gpt-6-astra"),
  OPENAI_MAX_RUN_USD: z.coerce.number().positive().default(2),
  OPENAI_MAX_EVENT_USD: z.coerce.number().positive().default(50),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

export type ProviderName = "federato" | "baseten" | "openai" | "sentry";

export function readServerEnvironment() {
  return serverEnvironmentSchema.parse(process.env);
}

export function getProviderConfiguration(): Record<ProviderName, { configured: boolean; missing: string[] }> {
  const environment = readServerEnvironment();
  const requirements: Record<ProviderName, Array<keyof typeof environment>> = {
    federato: ["FEDERATO_CLIENT_ID", "FEDERATO_CLIENT_SECRET", "FEDERATO_AUTH_URL", "FEDERATO_HANDLER_URL"],
    baseten: ["BASETEN_API_KEY", "BASETEN_OPENAI_BASE_URL", "BASETEN_FAST_MODEL", "BASETEN_REASONING_MODEL", "BASETEN_COMPILER_MODEL"],
    openai: ["OPENAI_API_KEY", "OPENAI_FAST_MODEL", "OPENAI_REVIEW_MODEL"],
    sentry: ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"],
  };

  return Object.fromEntries(
    Object.entries(requirements).map(([provider, keys]) => {
      const missing = keys.filter((key) => !environment[key]).map(String);
      return [provider, { configured: missing.length === 0, missing }];
    }),
  ) as Record<ProviderName, { configured: boolean; missing: string[] }>;
}
