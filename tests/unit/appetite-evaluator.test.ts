import { describe, expect, it } from "vitest";

import { buildingYearRule, evidence, lossRule, premiumRule, tivRule } from "../../fixtures/decision-cases";
import { decisionScores, determineActionTier, evaluateRule } from "../../lib/appetite/evaluator";

describe("premium and TIV boundaries", () => {
  it.each([
    [49_999, "fail"], [50_000, "pass"], [75_000, "target"],
    [100_000, "target"], [175_000, "pass"], [175_001, "fail"],
  ] as const)("classifies premium %d as %s", (value, status) => {
    expect(evaluateRule({ rule: premiumRule, value }).status).toBe(status);
  });

  it.each([
    [49_999_999, "pass"], [50_000_000, "target"], [100_000_000, "target"],
    [100_000_001, "pass"], [150_000_000, "pass"], [150_000_001, "fail"],
  ] as const)("classifies TIV %d as %s", (value, status) => {
    expect(evaluateRule({ rule: tivRule, value }).status).toBe(status);
  });
});

describe("open boundaries", () => {
  it.each([[1989, "fail"], [1990, "conflict"], [1991, "pass"], [2010, "pass"], [2011, "target"]] as const)(
    "does not invent a building-year interpretation for %d",
    (value, status) => expect(evaluateRule({ rule: buildingYearRule, value }).status).toBe(status),
  );

  it.each([[99_999, "pass"], [100_000, "conflict"], [100_001, "fail"]] as const)(
    "does not invent a loss interpretation for %d",
    (value, status) => expect(evaluateRule({ rule: lossRule, value }).status).toBe(status),
  );
});

describe("messy evidence and precedence", () => {
  it("keeps missing, conflict, and verified failure distinct", () => {
    const missing = evaluateRule({ rule: buildingYearRule });
    const conflict = evaluateRule({
      rule: buildingYearRule,
      evidence: [evidence("E-1", "building.year", 2005), evidence("E-2", "building.year", 2015)],
    });
    const failure = evaluateRule({ rule: buildingYearRule, value: 1989 });
    expect([missing.status, conflict.status, failure.status]).toEqual(["missing", "conflict", "fail"]);
    expect(determineActionTier([missing])).toBe("request_information");
    expect(determineActionTier([conflict])).toBe("manual_review");
    expect(determineActionTier([failure, missing])).toBe("likely_decline");
  });

  it("normalizes numeric strings without treating zero as missing", () => {
    expect(evaluateRule({ rule: premiumRule, value: "75,000" }).status).toBe("target");
    expect(evaluateRule({ rule: premiumRule, value: 0 }).status).toBe("fail");
  });

  it("computes target alignment and evidence completeness", () => {
    const atoms = [
      evaluateRule({ rule: premiumRule, value: 75_000 }),
      evaluateRule({ rule: tivRule, value: 125_000_000 }),
      evaluateRule({ rule: buildingYearRule }),
    ];
    expect(decisionScores(atoms)).toEqual({ targetAlignment: 1 / 3, evidenceCompleteness: 2 / 3 });
    expect(determineActionTier(atoms)).toBe("request_information");
  });
});
