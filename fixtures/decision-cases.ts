import type { AppetiteRule, EvidenceItem } from "../lib/contracts";

const baseRule = {
  version: "2025-1",
  scope: "submission",
  missingBehavior: "request_information" as const,
  ambiguity: null,
  hardGate: true,
};

export const premiumRule: AppetiteRule = {
  ...baseRule,
  id: "PREMIUM-2025",
  concept: "premium",
  acceptable: [{ operator: "between", value: [50_000, 175_000], unit: "USD" }],
  target: [{ operator: "between", value: [75_000, 100_000], unit: "USD" }],
  unacceptable: [
    { operator: "lt", value: 50_000, unit: "USD" },
    { operator: "gt", value: 175_000, unit: "USD" },
  ],
  sourceText: "$50K–$175K acceptable; $75K–$100K target.",
};

export const tivRule: AppetiteRule = {
  ...baseRule,
  id: "TIV-2025",
  concept: "total insured value",
  acceptable: [{ operator: "lte", value: 150_000_000, unit: "USD" }],
  target: [{ operator: "between", value: [50_000_000, 100_000_000], unit: "USD" }],
  unacceptable: [{ operator: "gt", value: 150_000_000, unit: "USD" }],
  sourceText: "Up to $150M acceptable; $50M–$100M target.",
};

export const buildingYearRule: AppetiteRule = {
  ...baseRule,
  id: "YEAR-2025",
  concept: "building year",
  acceptable: [{ operator: "gt", value: 1990 }],
  target: [{ operator: "gt", value: 2010 }],
  unacceptable: [{ operator: "lt", value: 1990 }],
  ambiguity: "Exactly 1990 is unspecified; exactly 2010 is acceptable, not target.",
  sourceText: "Newer than 1990 acceptable; newer than 2010 target; older than 1990 unacceptable.",
};

export const lossRule: AppetiteRule = {
  ...baseRule,
  id: "LOSS-2025",
  concept: "five-year loss value",
  acceptable: [{ operator: "lt", value: 100_000, unit: "USD" }],
  target: [],
  unacceptable: [{ operator: "gt", value: 100_000, unit: "USD" }],
  ambiguity: "Exactly $100,000 is unspecified.",
  sourceText: "Under $100K acceptable; over $100K unacceptable.",
};

export function evidence(id: string, fieldPath: string, normalizedValue: unknown): EvidenceItem {
  return {
    id,
    resource: "Submission",
    recordId: "submission-1",
    fieldPath,
    rawValue: normalizedValue,
    normalizedValue,
    provenance: "cached_snapshot",
    retrievedAt: "2026-09-19T12:00:00.000Z",
  };
}
