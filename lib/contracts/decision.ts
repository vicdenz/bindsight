import { z } from "zod";

export const ruleStatusSchema = z.enum([
  "target",
  "pass",
  "fail",
  "missing",
  "conflict",
  "not_applicable",
]);

export const actionTierSchema = z.enum([
  "review_now",
  "standard_review",
  "request_information",
  "manual_review",
  "likely_decline",
  "screened_out",
  "not_evaluated",
]);

export const screeningStatusSchema = z.enum(["evaluated", "renewal", "unsupported_line"]);

export const predicateSchema = z.object({
  operator: z.enum(["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "between", "percentage_gt"]),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.tuple([z.number(), z.number()])]),
  unit: z.string().optional(),
});

export const appetiteRuleSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  concept: z.string().min(1),
  scope: z.string().min(1),
  acceptable: z.array(predicateSchema),
  target: z.array(predicateSchema),
  unacceptable: z.array(predicateSchema),
  missingBehavior: z.enum(["request_information", "manual_review", "not_applicable"]),
  ambiguity: z.string().nullable(),
  sourceText: z.string().min(1),
  hardGate: z.boolean().default(true),
});

export const evidenceItemSchema = z.object({
  id: z.string().min(1),
  resource: z.string().min(1),
  recordId: z.string().min(1),
  fieldPath: z.string().min(1),
  rawValue: z.unknown(),
  normalizedValue: z.unknown(),
  provenance: z.enum(["federato", "cached_snapshot", "derived", "user_supplied"]),
  retrievedAt: z.string().datetime(),
});

export const calculationSchema = z.object({
  id: z.string().min(1),
  operation: z.enum(["sum", "count", "ratio", "difference", "identity", "min"]),
  inputIds: z.array(z.string().min(1)).min(1),
  unit: z.string().min(1),
  result: z.number(),
});

export const decisionAtomSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  evidenceIds: z.array(z.string()),
  calculationIds: z.array(z.string()),
  status: ruleStatusSchema,
  reason: z.string().min(1),
  hardGate: z.boolean(),
});

export const decisionPacketSchema = z.object({
  submission: z.object({
    id: z.string().min(1),
    accountName: z.string().min(1),
    submissionType: z.string().nullable(),
    lineOfBusiness: z.string().nullable(),
    sourceStatus: z.string().nullable().optional(),
    primaryState: z.string().nullable(),
    premium: z.number().nullable(),
    totalInsuredValue: z.number().nullable(),
    receivedAt: z.string().datetime(),
  }),
  atoms: z.array(decisionAtomSchema),
  evidence: z.array(evidenceItemSchema),
  calculations: z.array(calculationSchema),
  tier: actionTierSchema,
  screening: z.object({
    status: screeningStatusSchema,
    profileId: z.string().nullable(),
    reason: z.string().min(1),
  }),
  score: z.object({
    targetAlignment: z.number().min(0).max(1),
    evidenceCompleteness: z.number().min(0).max(1),
    portfolioContribution: z.number().min(-1).max(1),
    premiumOpportunity: z.number().min(0).max(1),
  }),
  explanation: z.string().min(1),
  nextBestQuestion: z.object({
    field: z.string(),
    question: z.string(),
    rationale: z.string(),
    possibleTierChange: z.boolean(),
  }).nullable(),
  qualityIssues: z.array(z.string()),
  assumptions: z.array(z.string()),
  portfolioDelta: z.object({
    dimension: z.string(),
    before: z.number(),
    after: z.number(),
    unit: z.string(),
  }).nullable(),
  analysis: z.object({
    status: z.enum(["queued", "analyzing", "complete", "recoverable_error"]),
    latencyMs: z.number().nonnegative(),
    source: z.enum(["live", "cached"]),
  }),
});

export type RuleStatus = z.infer<typeof ruleStatusSchema>;
export type ActionTier = z.infer<typeof actionTierSchema>;
export type ScreeningStatus = z.infer<typeof screeningStatusSchema>;
export type AppetiteRule = z.infer<typeof appetiteRuleSchema>;
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type Calculation = z.infer<typeof calculationSchema>;
export type DecisionAtom = z.infer<typeof decisionAtomSchema>;
export type DecisionPacket = z.infer<typeof decisionPacketSchema>;
