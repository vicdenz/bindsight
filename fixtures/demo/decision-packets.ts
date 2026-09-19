import type { AppetiteRule, DecisionPacket, EvidenceItem } from "../../lib/contracts";
import { decisionPacketSchema } from "../../lib/contracts";
import { decisionScores, determineActionTier, evaluateRule } from "../../lib/appetite/evaluator";

const retrievedAt = "2026-09-19T12:00:00.000Z";
const receivedAt = "2026-09-18T12:00:00.000Z";

const rules: Record<string, AppetiteRule> = {
  premium: {
    id: "R-PREMIUM", version: "2025.1", concept: "premium", scope: "submission", hardGate: true,
    acceptable: [{ operator: "between", value: [50_000, 175_000], unit: "USD" }],
    target: [{ operator: "between", value: [75_000, 100_000], unit: "USD" }],
    unacceptable: [{ operator: "lt", value: 50_000, unit: "USD" }, { operator: "gt", value: 175_000, unit: "USD" }],
    missingBehavior: "request_information", ambiguity: null,
    sourceText: "$50K–$175K acceptable; $75K–$100K target.",
  },
  state: {
    id: "R-STATE", version: "2025.1", concept: "primary state", scope: "submission", hardGate: true,
    acceptable: [{ operator: "in", value: ["OH", "PA", "MD", "CO", "CA", "FL", "NC", "SC", "GA", "VA", "UT"] }],
    target: [{ operator: "in", value: ["OH", "PA", "MD", "CO", "CA", "FL"] }],
    unacceptable: [{ operator: "not_in", value: ["OH", "PA", "MD", "CO", "CA", "FL", "NC", "SC", "GA", "VA", "UT"] }],
    missingBehavior: "request_information", ambiguity: null,
    sourceText: "Eleven states acceptable; OH, PA, MD, CO, CA, and FL target.",
  },
  year: {
    id: "R-YEAR", version: "2025.1", concept: "building year", scope: "building", hardGate: true,
    acceptable: [{ operator: "gt", value: 1990 }], target: [{ operator: "gt", value: 2010 }],
    unacceptable: [{ operator: "lt", value: 1990 }], missingBehavior: "request_information",
    ambiguity: "Exactly 1990 is unspecified.",
    sourceText: "Newer than 1990 acceptable; newer than 2010 target; older than 1990 unacceptable.",
  },
};

type DemoSeed = {
  id: string;
  accountName: string;
  state: string;
  premium: number;
  year: number | null;
  totalInsuredValue: number;
};

const seeds: DemoSeed[] = [
  { id: "sub-review-now", accountName: "Lakefront Robotics", state: "OH", premium: 85_000, year: 2018, totalInsuredValue: 75_000_000 },
  { id: "sub-standard", accountName: "Blue Ridge Textiles", state: "NC", premium: 60_000, year: 2004, totalInsuredValue: 42_000_000 },
  { id: "sub-request-info", accountName: "Capital Food Works", state: "MD", premium: 90_000, year: null, totalInsuredValue: 68_000_000 },
  { id: "sub-manual", accountName: "Keystone Components", state: "PA", premium: 82_000, year: 1990, totalInsuredValue: 81_000_000 },
  { id: "sub-likely-decline", accountName: "Empire Distribution", state: "NY", premium: 45_000, year: 1985, totalInsuredValue: 160_000_000 },
];

function evidence(seed: DemoSeed, fieldPath: string, value: unknown): EvidenceItem {
  return {
    id: `E-${seed.id}-${fieldPath.replaceAll(".", "-")}`,
    resource: "Submission",
    recordId: seed.id,
    fieldPath,
    rawValue: value,
    normalizedValue: value,
    provenance: "cached_snapshot",
    retrievedAt,
  };
}

function createPacket(seed: DemoSeed): DecisionPacket {
  const stateEvidence = evidence(seed, "primaryState", seed.state);
  const premiumEvidence = evidence(seed, "premium", seed.premium);
  const yearEvidence = seed.year === null ? [] : [evidence(seed, "building.year", seed.year)];
  const allEvidence = [stateEvidence, premiumEvidence, ...yearEvidence];
  const atoms = [
    evaluateRule({ rule: rules.state, evidence: [stateEvidence] }),
    evaluateRule({ rule: rules.premium, evidence: [premiumEvidence] }),
    evaluateRule({ rule: rules.year, evidence: yearEvidence }),
  ];
  const tier = determineActionTier(atoms, Object.values(rules));
  const scores = decisionScores(atoms);
  const missingYear = atoms.find((atom) => atom.ruleId === rules.year.id)?.status === "missing";

  return decisionPacketSchema.parse({
    submission: {
      id: seed.id,
      accountName: seed.accountName,
      primaryState: seed.state,
      premium: seed.premium,
      totalInsuredValue: seed.totalInsuredValue,
      receivedAt,
    },
    atoms,
    evidence: allEvidence,
    calculations: [],
    tier,
    score: {
      ...scores,
      portfolioContribution: tier === "review_now" ? 0.2 : 0,
      premiumOpportunity: Math.min(seed.premium / 175_000, 1),
    },
    explanation: `Cached deterministic analysis places ${seed.accountName} in ${tier.replaceAll("_", " ")}.`,
    nextBestQuestion: missingYear ? {
      field: "building.year",
      question: "What year was the primary insured structure constructed?",
      rationale: "The building year can change the appetite result from target to a hard failure.",
      possibleTierChange: true,
    } : null,
    qualityIssues: missingYear ? ["Primary building year is unavailable."] : [],
    assumptions: seed.year === 1990 ? ["The appetite guide does not classify exactly 1990."] : [],
    portfolioDelta: null,
    analysis: { status: "complete", latencyMs: 0, source: "cached" },
  });
}

export const demoDecisionPackets: readonly DecisionPacket[] = seeds.map(createPacket);
