import { describe, expect, it } from "vitest";
import type { DecisionPacket } from "../../lib/contracts";
import { rankDecisionPackets } from "../../lib/appetite/ranking";

function packet(id: string, tier: DecisionPacket["tier"], targetAlignment = 0.5): DecisionPacket {
  return {
    submission: { id, accountName: id, submissionType: "New Business", lineOfBusiness: "Property", primaryState: "OH", premium: 80_000, totalInsuredValue: 70_000_000, receivedAt: "2026-09-19T12:00:00.000Z" },
    atoms: [], evidence: [], calculations: [], tier,
    screening: { status: "evaluated", profileId: "commercial-property-2025.1", reason: "Fixture." },
    score: { targetAlignment, evidenceCompleteness: 1, portfolioContribution: 0, premiumOpportunity: 0.5 },
    explanation: "Fixture packet.", nextBestQuestion: null, qualityIssues: [], assumptions: [], portfolioDelta: null,
    analysis: { status: "complete", latencyMs: 1, source: "cached", mode: "demo" },
  };
}

describe("decision ranking", () => {
  it("orders tiers before score and uses the documented tier sequence", () => {
    const ranked = rankDecisionPackets([
      packet("decline", "outside_appetite", 1), packet("manual", "manual_review", 1),
      packet("info", "request_information", 1), packet("standard", "standard_review", 0),
      packet("now", "review_now", 0), packet("renewal", "screened_out", 1),
      packet("unsupported", "not_evaluated", 1),
    ]);
    expect(ranked.map((item) => item.submission.id)).toEqual(["now", "standard", "info", "manual", "decline", "renewal", "unsupported"]);
  });

  it("sorts by target alignment within a tier without mutating input", () => {
    const original = [packet("low", "review_now", 0.5), packet("high", "review_now", 1)];
    const ranked = rankDecisionPackets(original);
    expect(ranked.map((item) => item.submission.id)).toEqual(["high", "low"]);
    expect(original.map((item) => item.submission.id)).toEqual(["low", "high"]);
  });
});
