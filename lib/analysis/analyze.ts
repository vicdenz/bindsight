import { decisionAtomSchema, decisionPacketSchema, type AppetiteRule, type Calculation, type DecisionPacket, type EvidenceItem, type ScreeningStatus } from "../contracts";
import { decisionScores, determineActionTier, evaluateRule } from "../appetite/evaluator";
import { getAppetiteRules } from "../appetite/rules";
import { rankDecisionPackets } from "../appetite/ranking";
import type { NormalizedField, NormalizedSubmission } from "./types";

const fields: Record<string, NormalizedField> = {
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

type AnalysisOptions = { source?: "live" | "cached"; retrievedAt?: string };

function evidence(submission: NormalizedSubmission, field: NormalizedField, value: unknown, options: AnalysisOptions): EvidenceItem {
  const source = submission.fieldEvidence?.[field];
  return { id: `E-${submission.id}-${field}`, resource: source?.resource ?? "Submission", recordId: source?.recordId ?? submission.id, fieldPath: source?.fieldPath ?? field, rawValue: source?.rawValue ?? value, normalizedValue: value, provenance: source?.provenance ?? (options.source === "live" ? "federato" : "cached_snapshot"), retrievedAt: options.retrievedAt ?? "2026-09-19T12:00:00.000Z" };
}

function screeningStatus(submission: NormalizedSubmission): ScreeningStatus {
  if (submission.submissionType?.trim().toUpperCase() === "RENEWAL") return "renewal";
  if (submission.lineOfBusiness && submission.lineOfBusiness.trim().toUpperCase() !== "PROPERTY") return "unsupported_line";
  return "evaluated";
}

function shouldEvaluateRule(status: ScreeningStatus, ruleId: string): boolean {
  if (status === "evaluated") return true;
  if (status === "renewal") return ruleId === "R-BUSINESS-TYPE";
  return ruleId === "R-BUSINESS-TYPE" || ruleId === "R-LINE";
}

function premiumOpportunity(premium: number | null, status: ScreeningStatus): number {
  if (status !== "evaluated" || premium === null || premium < 50_000 || premium > 175_000) return 0;
  return premium >= 75_000 && premium <= 100_000 ? 1 : 0.5;
}

export function analyzeSubmission(submission: NormalizedSubmission, rules: readonly AppetiteRule[] = getAppetiteRules(), options: AnalysisOptions = {}): DecisionPacket {
  const ledger: EvidenceItem[] = [];
  const calculations: Calculation[] = [];
  const screening = screeningStatus(submission);
  const atoms = rules.map((rule) => {
    const field = fields[rule.id];
    const value = submission[field];
    if (!shouldEvaluateRule(screening, rule.id)) {
      return decisionAtomSchema.parse({
        id: `D-${rule.id}`,
        ruleId: rule.id,
        evidenceIds: [],
        calculationIds: [],
        status: "not_applicable",
        reason: screening === "renewal"
          ? "Not evaluated because this record is routed to the renewal workflow."
          : "Not evaluated because no appetite profile is loaded for this line of business.",
        hardGate: false,
      });
    }
    const items = value === null || value === undefined ? [] : [evidence(submission, field, value, options)];
    ledger.push(...items);
    const calculationSpec = submission.fieldEvidence?.[field]?.calculation;
    const fieldCalculations: Calculation[] = calculationSpec && items.length > 0 && typeof value === "number"
      ? [{ id: `C-${submission.id}-${field}`, operation: calculationSpec.operation, inputIds: [items[0].id], unit: calculationSpec.unit, result: value }]
      : [];
    calculations.push(...fieldCalculations);
    return evaluateRule({ rule, evidence: items, calculations: fieldCalculations, value });
  });
  const tier = screening === "renewal"
    ? "screened_out"
    : screening === "unsupported_line"
      ? "not_evaluated"
      : determineActionTier(atoms, rules);
  const scores = decisionScores(atoms);
  const missingAtom = screening === "evaluated" ? atoms.find((atom) => atom.hardGate && atom.status === "missing") : undefined;
  const missingField = missingAtom ? fields[missingAtom.ruleId] : undefined;
  const prompt = missingField ? questions[missingField] : undefined;
  const conflictAtoms = atoms.filter((atom) => atom.status === "conflict");
  const failedConcepts = atoms
    .filter((atom) => atom.status === "fail")
    .map((atom) => rules.find((rule) => rule.id === atom.ruleId)?.concept ?? atom.ruleId);
  const explanation = screening === "renewal"
    ? `${submission.accountName} is routed to the separate renewal workflow; the supplied profile is for new business.`
    : screening === "unsupported_line"
      ? `${submission.accountName} is not evaluated because no ${submission.lineOfBusiness ?? "unknown-line"} appetite profile is loaded.`
      : failedConcepts.length > 0
        ? `${submission.accountName} is outside the documented property appetite because of ${failedConcepts.slice(0, 3).join(", ")}.`
        : `${submission.accountName} passes every defined commercial-property appetite gate.`;
  const profileId = screening === "unsupported_line" ? null : "commercial-property-2025.1";
  const screeningReason = screening === "renewal"
    ? "Renewal business is separated from the new-business property queue."
    : screening === "unsupported_line"
      ? `No appetite profile is configured for ${submission.lineOfBusiness ?? "this line of business"}.`
      : "New property business is eligible for the commercial-property appetite assessment.";
  const aggregationAssumptions = screening === "evaluated" && options.source === "live"
    ? [
        "Building age uses the oldest building year in the insured schedule.",
        "Supported construction percentage is weighted by building TIV.",
        "Five-year loss value uses incurred amounts on claims linked to this policy as of submission receipt.",
      ]
    : [];

  return decisionPacketSchema.parse({
    submission: { id: submission.id, accountName: submission.accountName, submissionType: submission.submissionType, lineOfBusiness: submission.lineOfBusiness, sourceStatus: submission.sourceStatus ?? null, primaryState: submission.primaryState, premium: submission.premium, totalInsuredValue: submission.totalInsuredValue, receivedAt: submission.receivedAt },
    atoms, evidence: ledger, calculations, tier,
    screening: { status: screening, profileId, reason: screeningReason },
    score: { ...scores, portfolioContribution: 0, premiumOpportunity: premiumOpportunity(submission.premium, screening) },
    explanation,
    nextBestQuestion: missingField && prompt ? { field: missingField, question: prompt.question, rationale: prompt.rationale, possibleTierChange: true } : null,
    qualityIssues: atoms.filter((atom) => atom.status === "missing").map((atom) => `Missing evidence for ${rules.find((rule) => rule.id === atom.ruleId)?.concept ?? atom.ruleId}.`),
    assumptions: [...conflictAtoms.map((atom) => atom.reason), ...aggregationAssumptions], portfolioDelta: null,
    analysis: { status: "complete", latencyMs: 0, source: options.source ?? "cached" },
  });
}

export function analyzeSubmissions(submissions: readonly NormalizedSubmission[], rules: readonly AppetiteRule[] = getAppetiteRules(), options: AnalysisOptions = {}): DecisionPacket[] {
  return rankDecisionPackets(submissions.map((submission) => analyzeSubmission(submission, rules, options)));
}
