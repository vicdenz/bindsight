import { describe, expect, it } from "vitest";
import { getDemoDecisionPackets } from "../../lib/cache/demo-snapshot";
import type { ReviewerProvider, ReviewerProviderResult } from "../../lib/openai/client";
import { runReviewer } from "../../lib/openai/reviewer";

class RepeatingProvider implements ReviewerProvider {
  async respond(): Promise<ReviewerProviderResult> {
    return {
      toolCalls: [{ id: "repeat", name: "get_decision_packet", arguments: { submission_id: "sub-review-now" } }],
      tokens: { input: 1, output: 1 },
      costUsd: 0,
    };
  }
}

describe("reviewer runtime safety", () => {
  it("stops an unbounded tool loop after four calls", async () => {
    const result = await runReviewer("Explain", {
      provider: new RepeatingProvider(),
      packets: getDemoDecisionPackets(),
    });
    expect(result.insufficientEvidence).toBe(true);
    expect(result.answer).toMatch(/4-tool limit/);
  });

  it("returns insufficient evidence when provider is unavailable", async () => {
    const provider: ReviewerProvider = { respond: async () => { throw new Error("offline"); } };
    const result = await runReviewer("Explain", { provider, packets: getDemoDecisionPackets() });
    expect(result).toMatchObject({ insufficientEvidence: true, citedIds: [] });
    expect(result.answer).toMatch(/offline/);
  });
});
