import { describe, expect, it, vi } from "vitest";
import { demoDecisionPackets } from "../../fixtures/demo/decision-packets";
import { sanitizedFederatoSchema } from "../../fixtures/federato/schema";
import { validPolicyPlan } from "../../fixtures/federato/plans";
import { BasetenClient } from "../../lib/baseten/client";
import { explainPackets } from "../../lib/baseten/explanation-agent";
import { planQuery } from "../../lib/baseten/query-agent";

describe("Baseten fixed provider fixtures", () => {
  it("achieves repaired plan validity without paid calls", async () => {
    const complete = vi.fn()
      .mockResolvedValueOnce({ content: JSON.stringify({ ...validPolicyPlan, resource: "Invented" }) })
      .mockResolvedValueOnce({ content: JSON.stringify(validPolicyPlan) });
    const result = await planQuery({ client: new BasetenClient({ complete }, { retries: 0 }), model: "fixture", schema: sanitizedFederatoSchema, evidenceGoals: ["premium"] });
    expect(result.revisions).toBe(1);
  });

  it("produces deterministic fallbacks for the full fixture batch", async () => {
    const complete = vi.fn().mockResolvedValue({ content: "{}" });
    const results = await explainPackets({ client: new BasetenClient({ complete }, { retries: 0 }), model: "fixture", packets: demoDecisionPackets, concurrency: 2 });
    expect(results).toHaveLength(demoDecisionPackets.length);
    expect(results.every((result, index) => result.provider === "fallback" && result.tier === demoDecisionPackets[index].tier)).toBe(true);
    expect(complete).toHaveBeenCalledTimes(demoDecisionPackets.length * 2);
  });
});
