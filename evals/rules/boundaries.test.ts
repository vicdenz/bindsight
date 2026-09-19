import { describe, expect, it } from "vitest";
import { buildingYearRule, lossRule, premiumRule, tivRule } from "../../fixtures/decision-cases";
import { evaluateRule } from "../../lib/appetite/evaluator";

describe("fixed appetite oracle", () => {
  const cases = [
    [premiumRule, 49_999, "fail"], [premiumRule, 50_000, "pass"], [premiumRule, 75_000, "target"], [premiumRule, 175_001, "fail"],
    [tivRule, 50_000_000, "target"], [tivRule, 150_000_000, "pass"], [tivRule, 150_000_001, "fail"],
    [buildingYearRule, 1990, "conflict"], [buildingYearRule, 2010, "pass"], [buildingYearRule, 2011, "target"],
    [lossRule, 99_999, "pass"], [lossRule, 100_000, "conflict"], [lossRule, 100_001, "fail"],
  ] as const;

  it.each(cases)("evaluates %s at %s as %s", (rule, value, expected) => {
    expect(evaluateRule({ rule, value }).status).toBe(expected);
  });
});
