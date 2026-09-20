import { decisionPacketSchema, type AppetiteRule, type DecisionPacket, type EvidenceItem } from "../contracts";
import { decisionScores, determineActionTier, evaluateRule } from "../appetite/evaluator";
import { getAppetiteRules } from "../appetite/rules";
import { rankDecisionPackets } from "../appetite/ranking";
import type { NormalizedSubmission } from "./types";

const fields: Record<string, keyof NormalizedSubmission> = {
  "R-BUSINESS-TYPE": "submissionType", "R-LINE": "lineOfBusiness", "R-STATE": "primaryState", "R-TIV": "totalInsuredValue",
  "R-PREMIUM": "premium", "R-BUILDING-YEAR": "buildingYear", "R-CONSTRUCTION": "supportedConstructionPercentage", "R-LOSS": "fiveYearLossValue",
};

const questions: Partial<Record<keyof NormalizedSubmission, { question: string; rationale: string }>> = {
  submissionType: { question: "Is this submission new business or a renewal?", rationale: "Renewals are outside the documented appetite." },
  lineOfBusiness: { question: "What line of business is being submitted?", rationale: "Only property submissions are acceptable." },
  primaryState: { question: "What is the primary risk state?", rationale: "State determines both eligibility and target alignment." },
  totalInsuredValue: { question: "What is the total insured value?", rationale: "TIV above $150M is a hard appetite failure." },
  premium: { question: "What is the expected annual premium?", rationale: "Premium outside $50K–$175K is a hard appetite failure." },
  buildingYear: { question: "What year was the primary insured structure constructed?", rationale: "An older building can create a hard appetite failure, while a newer building can be a target." },
  supportedConstructionPercentage: { question: "What percentage of construction is joisted masonry, non-combustible/steel, or masonry non-combustible?", rationale: "The construction mix determines appetite eligibility." },
  fiveYearLossValue: { question: "What is the total five-year loss value?", rationale: "Loss value over $100K is a hard appetite failure." },
};

function evidence(submission: NormalizedSubmission, field: keyof NormalizedSubmission, value: unknown): EvidenceItem {
  return { id: `E-${submission.id}-${field}`, resource: "Submission", recordId: submission.id, fieldPath: field, rawValue: value, normalizedValue: value, provenance: "cached_snapshot", retrievedAt: "2026-09-19T12:00:00.000Z" };
}

export function analyzeSubmission(submission: NormalizedSubmission, rules: readonly AppetiteRule[] = getAppetiteRules()): DecisionPacket {
  const ledger: EvidenceItem[] = [];
  const atoms = rules.map((rule) => {
    const field = fields[rule.id];
    const value = submission[field];
    const items = value === null || value === undefined ? [] : [evidence(submission, field, value)];
    ledger.push(...items);
    return evaluateRule({ rule, evidence: items });
  });
  const tier = determineActionTier(atoms, rules);
  const scores = decisionScores(atoms);
  const missingAtom = atoms.find((atom) => atom.hardGate && atom.status === "missing");
  const missingField = missingAtom ? fields[missingAtom.ruleId] : undefined;
  const prompt = missingField ? questions[missingField] : undefined;
  const conflictAtoms = atoms.filter((atom) => atom.status === "conflict");

  return decisionPacketSchema.parse({
    submission: { id: submission.id, accountName: submission.accountName, primaryState: submission.primaryState, premium: submission.premium, totalInsuredValue: submission.totalInsuredValue, receivedAt: submission.receivedAt },
    atoms, evidence: ledger, calculations: [], tier,
    score: { ...scores, portfolioContribution: 0, premiumOpportunity: submission.premium === null ? 0 : Math.min(submission.premium / 175_000, 1) },
    explanation: `${submission.accountName} is assigned to ${tier.replaceAll("_", " ")} by eight deterministic appetite checks.`,
    nextBestQuestion: missingField && prompt ? { field: missingField, question: prompt.question, rationale: prompt.rationale, possibleTierChange: true } : null,
    qualityIssues: atoms.filter((atom) => atom.status === "missing").map((atom) => `Missing evidence for ${rules.find((rule) => rule.id === atom.ruleId)?.concept ?? atom.ruleId}.`),
    assumptions: conflictAtoms.map((atom) => atom.reason), portfolioDelta: null,
    analysis: { status: "complete", latencyMs: 0, source: "cached" },
  });
}

export function analyzeSubmissions(submissions: readonly NormalizedSubmission[], rules: readonly AppetiteRule[] = getAppetiteRules()): DecisionPacket[] {
  return rankDecisionPackets(submissions.map((submission) => analyzeSubmission(submission, rules)));
}
