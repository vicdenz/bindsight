import { z } from "zod";

export const reviewerResponseSchema = z.object({
  answer: z.string(),
  toolCalls: z.array(z.object({ name: z.string(), arguments: z.record(z.string(), z.unknown()) })).max(4),
  citedIds: z.array(z.string()),
  insufficientEvidence: z.boolean(),
  provider: z.literal("openai"),
  model: z.string(),
  tokens: z.object({ input: z.number().int().nonnegative(), output: z.number().int().nonnegative() }),
  estimatedCostUsd: z.number().nonnegative(),
  validation: z.object({ valid: z.boolean(), errors: z.array(z.string()) }),
});

export type ReviewerResponse = z.infer<typeof reviewerResponseSchema>;
