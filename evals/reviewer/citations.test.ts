import { describe, expect, it } from "vitest";
import type { DecisionPacket } from "../../lib/contracts";
import { validateReviewerCitations } from "../../lib/openai/citations";

const packet = {
  submission: { id: "S-1" },
  atoms: [{ id: "D-1", ruleId: "R-1" }],
  evidence: [{ id: "E-1" }],
  calculations: [{ id: "C-1" }],
} as DecisionPacket;

describe("reviewer citation validation", () => {
  it("accepts IDs grounded in supplied packets", () => {
    expect(validateReviewerCitations(
      { citedIds: ["E-1", "C-1", "R-1"], insufficientEvidence: false },
      [packet],
    ).valid).toBe(true);
  });

  it("rejects invented citations while allowing a source to support multiple claims", () => {
    const result = validateReviewerCitations(
      { citedIds: ["E-404", "E-1", "E-1"], insufficientEvidence: false },
      [packet],
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Unknown citation ID: E-404");
    expect(result.errors).not.toContain("Duplicate citation ID: E-1");
  });

  it("accepts repeated known citation IDs", () => {
    expect(validateReviewerCitations(
      { citedIds: ["E-1", "E-1"], insufficientEvidence: false }, [packet],
    ).valid).toBe(true);
  });

  it("requires citations unless the answer reports insufficient evidence", () => {
    expect(validateReviewerCitations(
      { citedIds: [], insufficientEvidence: false }, [packet],
    ).valid).toBe(false);
    expect(validateReviewerCitations(
      { citedIds: [], insufficientEvidence: true }, [packet],
    ).valid).toBe(true);
  });
});
