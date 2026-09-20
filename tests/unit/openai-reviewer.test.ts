import { describe, expect, it } from "vitest";
import { getDemoDecisionPackets } from "../../lib/cache/demo-snapshot";
import type { ReviewerProvider, ReviewerProviderResult } from "../../lib/openai/client";
import { routeReviewerQuestion, runReviewer } from "../../lib/openai/reviewer";

class ScriptedProvider implements ReviewerProvider {
  constructor(private readonly results: ReviewerProviderResult[]) {}
  async respond() {
    const result = this.results.shift();
    if (!result) throw new Error("No scripted result");
    return result;
  }
}

const usage = { tokens: { input: 10, output: 5 }, costUsd: 0.01 };

describe("reviewer runtime", () => {
  it("routes question complexity", () => {
    expect(routeReviewerQuestion("Explain this submission")).toBe("fast");
    expect(routeReviewerQuestion("Compare these submissions")).toBe("review");
    expect(routeReviewerQuestion("Simulate a counterfactual")).toBe("deep");
  });

  it("executes a read-only tool and validates citations", async () => {
    const packet = getDemoDecisionPackets()[0];
    const evidenceId = packet.evidence[0].id;
    const provider = new ScriptedProvider([
      { ...usage, toolCalls: [{ id: "call-1", name: "inspect_evidence", arguments: { evidence_ids: [evidenceId] } }] },
      { ...usage, answer: "The evidence supports the result.", citedIds: [evidenceId], insufficientEvidence: false },
    ]);
    const result = await runReviewer("Explain the evidence", { provider, packets: [packet] });
    expect(result.validation.valid).toBe(true);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.citedIds).toEqual([evidenceId]);
  });

  it("rejects write tools and invalid citations with safe fallback", async () => {
    const packets = getDemoDecisionPackets();
    const write = await runReviewer("Bind this", {
      provider: new ScriptedProvider([{ ...usage, toolCalls: [{ id: "x", name: "bind_policy", arguments: {} }] }]),
      packets,
    });
    expect(write.insufficientEvidence).toBe(true);
    expect(write.toolCalls).toHaveLength(0);

    const invented = await runReviewer("Explain this", {
      provider: new ScriptedProvider([{ ...usage, answer: "Claim", citedIds: ["E-INVENTED"], insufficientEvidence: false }]),
      packets,
    });
    expect(invented.validation.valid).toBe(false);
    expect(invented.insufficientEvidence).toBe(true);
  });
});
