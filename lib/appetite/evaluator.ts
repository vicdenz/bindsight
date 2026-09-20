import {
  decisionAtomSchema,
  type ActionTier,
  type AppetiteRule,
  type Calculation,
  type DecisionAtom,
  type EvidenceItem,
  type RuleStatus,
} from "../contracts";

type Predicate = AppetiteRule["acceptable"][number];

export interface RuleEvaluationInput {
  rule: AppetiteRule;
  evidence?: readonly EvidenceItem[];
  calculations?: readonly Calculation[];
  value?: unknown;
  conflict?: boolean;
}

function comparable(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const numeric = Number(trimmed.replaceAll(",", ""));
    if (trimmed !== "" && Number.isFinite(numeric)) return numeric;
    return trimmed.toUpperCase();
  }
  return value;
}

export function matchesPredicate(rawValue: unknown, predicate: Predicate): boolean {
  const value = comparable(rawValue);
  const expected = Array.isArray(predicate.value)
    ? predicate.value.map(comparable)
    : comparable(predicate.value);

  switch (predicate.operator) {
    case "eq": return value === expected;
    case "neq": return value !== expected;
    case "in": return Array.isArray(expected) && expected.includes(value);
    case "not_in": return Array.isArray(expected) && !expected.includes(value);
    case "gt": return typeof value === "number" && typeof expected === "number" && value > expected;
    case "gte": return typeof value === "number" && typeof expected === "number" && value >= expected;
    case "lt": return typeof value === "number" && typeof expected === "number" && value < expected;
    case "lte": return typeof value === "number" && typeof expected === "number" && value <= expected;
    case "between": return typeof value === "number" && Array.isArray(expected)
      && typeof expected[0] === "number" && typeof expected[1] === "number"
      && value >= expected[0] && value <= expected[1];
    case "percentage_gt": return typeof value === "number" && typeof expected === "number" && value > expected;
  }
}

function hasKnownOpenBoundary(rule: AppetiteRule, rawValue: unknown): string | null {
  if (!rule.ambiguity) return null;
  const value = comparable(rawValue);
  const concept = rule.concept.toLowerCase();
  if ((concept.includes("building") || concept.includes("year")) && value === 1990) {
    return "Exactly 1990 is not defined by the appetite guide.";
  }
  if (concept.includes("loss") && value === 100_000) {
    return "Exactly $100,000 in five-year losses is not defined by the appetite guide.";
  }
  return null;
}

function atom(rule: AppetiteRule, status: RuleStatus, reason: string, evidence: readonly EvidenceItem[], calculations: readonly Calculation[]): DecisionAtom {
  return decisionAtomSchema.parse({
    id: `D-${rule.id}`,
    ruleId: rule.id,
    evidenceIds: evidence.map((item) => item.id),
    calculationIds: calculations.map((item) => item.id),
    status,
    reason,
    hardGate: rule.hardGate,
  });
}

export function evaluateRule(input: RuleEvaluationInput): DecisionAtom {
  const evidence = input.evidence ?? [];
  const calculations = input.calculations ?? [];
  const suppliedValues = evidence.map((item) => item.normalizedValue).filter((value) => value !== null && value !== undefined && value !== "");
  const value = input.value ?? calculations.at(-1)?.result ?? suppliedValues[0];

  if (input.conflict || (input.value === undefined && new Set(suppliedValues.map((item) => JSON.stringify(comparable(item)))).size > 1)) {
    return atom(input.rule, "conflict", "Decision-critical sources disagree.", evidence, calculations);
  }
  if (value === null || value === undefined || value === "") {
    const status = input.rule.missingBehavior === "not_applicable" ? "not_applicable" : "missing";
    return atom(input.rule, status, status === "missing" ? "Required evidence is unavailable." : "The rule is not applicable without this evidence.", evidence, calculations);
  }

  const boundary = hasKnownOpenBoundary(input.rule, value);
  if (boundary) return atom(input.rule, "conflict", boundary, evidence, calculations);

  if (input.rule.unacceptable.some((predicate) => matchesPredicate(value, predicate))) {
    return atom(input.rule, "fail", "Verified evidence matches an unacceptable predicate.", evidence, calculations);
  }
  if (input.rule.target.some((predicate) => matchesPredicate(value, predicate))) {
    return atom(input.rule, "target", "Verified evidence matches a target predicate.", evidence, calculations);
  }
  if (input.rule.acceptable.some((predicate) => matchesPredicate(value, predicate))) {
    return atom(input.rule, "pass", "Verified evidence matches an acceptable predicate.", evidence, calculations);
  }
  return atom(input.rule, "conflict", "Verified evidence does not match a defined appetite outcome.", evidence, calculations);
}

export function determineActionTier(atoms: readonly DecisionAtom[], rules: readonly AppetiteRule[] = []): ActionTier {
  if (atoms.some((item) => item.hardGate && item.status === "fail")) return "outside_appetite";
  if (atoms.some((item) => item.hardGate && item.status === "conflict")) return "manual_review";

  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  if (atoms.some((item) => item.status === "missing" && rulesById.get(item.ruleId)?.missingBehavior === "manual_review")) return "manual_review";
  if (atoms.some((item) => item.hardGate && item.status === "missing")) return "request_information";

  const scored = atoms.filter((item) => item.status !== "not_applicable");
  const targetCount = scored.filter((item) => item.status === "target").length;
  return scored.length > 0 && targetCount / scored.length >= 0.5 ? "review_now" : "standard_review";
}

export function decisionScores(atoms: readonly DecisionAtom[]): { targetAlignment: number; evidenceCompleteness: number } {
  const applicable = atoms.filter((item) => item.status !== "not_applicable");
  if (applicable.length === 0) return { targetAlignment: 0, evidenceCompleteness: 0 };
  return {
    targetAlignment: applicable.filter((item) => item.status === "target").length / applicable.length,
    evidenceCompleteness: applicable.filter((item) => !["missing", "conflict"].includes(item.status)).length / applicable.length,
  };
}
