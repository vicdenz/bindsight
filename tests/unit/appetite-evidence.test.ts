import { describe, expect, it } from "vitest";
import { evidence } from "../../fixtures/decision-cases";
import { calculate, createEvidenceItem, validateCalculations, validateDecisionReferences } from "../../lib/evidence";

describe("evidence integrity", () => {
  it("creates repeatable evidence IDs independent of retrieval time", () => {
    const base = { resource: "Building", recordId: "B-1", fieldPath: "tiv", rawValue: "500", normalizedValue: 500, provenance: "federato" as const };
    const first = createEvidenceItem({ ...base, retrievedAt: "2026-09-19T12:00:00.000Z" });
    const second = createEvidenceItem({ ...base, retrievedAt: "2026-09-20T12:00:00.000Z" });
    expect(first.id).toBe(second.id);
  });

  it("calculates totals and rejects dangling references", () => {
    const inputs = [evidence("E-1", "tiv", 20), evidence("E-2", "tiv", 30)];
    const total = calculate("C-1", "sum", inputs, "USD");
    expect(total.result).toBe(50);
    expect(validateCalculations([total], inputs)).toEqual([]);
    expect(validateCalculations([{ ...total, inputIds: ["E-404"] }], inputs)[0]).toContain("unknown");
  });

  it("finds atom references that do not resolve", () => {
    const errors = validateDecisionReferences([
      { id: "D-1", ruleId: "R-1", evidenceIds: ["E-missing"], calculationIds: [], status: "pass", reason: "test", hardGate: true },
    ], [], []);
    expect(errors).toEqual(["Atom D-1 references unknown evidence E-missing"]);
  });
});
