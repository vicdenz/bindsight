import { describe, expect, it, vi } from "vitest";
import { demoDecisionPackets } from "../../fixtures/demo/decision-packets";
import { sanitizedFederatoSchema } from "../../fixtures/federato/schema";
import { validPolicyPlan } from "../../fixtures/federato/plans";
import { compileAppetite } from "../../lib/baseten/appetite-agent";
import { BasetenClient } from "../../lib/baseten/client";
import { explainPacket, validateExplanation } from "../../lib/baseten/explanation-agent";
import { planQuery } from "../../lib/baseten/query-agent";
import type { AppetiteRule } from "../../lib/contracts/decision";

const rule: AppetiteRule = {
  id: "R-PREMIUM", version: "2025.1", concept: "premium", scope: "submission",
  acceptable: [{ operator: "between", value: [50_000, 175_000], unit: "USD" }],
  target: [{ operator: "between", value: [75_000, 100_000], unit: "USD" }],
  unacceptable: [{ operator: "lt", value: 50_000, unit: "USD" }],
  missingBehavior: "request_information", ambiguity: null, sourceText: "fixture", hardGate: true,
};

function clientFrom(contents: string[]) {
  const complete = vi.fn();
  for (const content of contents) complete.mockResolvedValueOnce({ content });
  return { client: new BasetenClient({ complete }, { retries: 0 }), complete };
}

describe("Baseten structured lanes", () => {
  it("repairs appetite output once using validator feedback", async () => {
    const fixture = clientFrom(["{}", JSON.stringify({ rules: [rule], ambiguities: [] })]);
    const result = await compileAppetite({ client: fixture.client, model: "m", appetiteText: "fixture" });
    expect(result).toMatchObject({ repaired: true, provider: "baseten", rules: [rule] });
    expect(fixture.complete).toHaveBeenCalledTimes(2);
    expect(fixture.complete.mock.calls[1][0].messages.at(-1).content).toContain("validation errors");
  });

  it("uses validated fallback rules after one failed repair", async () => {
    const fixture = clientFrom(["{}", "{}"]);
    await expect(compileAppetite({ client: fixture.client, model: "m", appetiteText: "fixture", fallbackRules: [rule] }))
      .resolves.toMatchObject({ provider: "fallback", rules: [rule] });
  });

  it("repairs a schema-invalid query plan within two revisions", async () => {
    const invalid = { ...validPolicyPlan, select: ["invented"] };
    const fixture = clientFrom([JSON.stringify(invalid), JSON.stringify(validPolicyPlan)]);
    const result = await planQuery({ client: fixture.client, model: "m", schema: sanitizedFederatoSchema, evidenceGoals: ["premium"] });
    expect(result).toEqual({ plan: validPolicyPlan, revisions: 1 });
    expect(fixture.complete.mock.calls[1][0].messages.at(-1).content).toContain("Unknown field");
  });

  it("caps query revisions at two", async () => {
    const fixture = clientFrom(["{}", "{}", "{}"]);
    await expect(planQuery({ client: fixture.client, model: "m", schema: sanitizedFederatoSchema, evidenceGoals: [] }))
      .rejects.toThrow("after 2 revisions");
    expect(fixture.complete).toHaveBeenCalledTimes(3);
  });

  it("rejects unknown citations, unsupported numbers, and tier changes", () => {
    const packet = demoDecisionPackets[0];
    const result = validateExplanation({ text: "Premium is $999 [UNKNOWN].", citations: ["UNKNOWN"], tier: "outside_appetite" }, packet);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.join(" ")).toContain("Unknown citation");
      expect(result.errors.join(" ")).toContain("Unsupported numeric");
      expect(result.errors.join(" ")).toContain("contradicts");
    }
  });

  it("does not treat digits inside valid citation IDs as factual numbers", () => {
    const packet = structuredClone(demoDecisionPackets[0]);
    packet.atoms[0].id = "D17";
    const result = validateExplanation({ text: "The deterministic record supports review [D17].", citations: ["D17"], tier: packet.tier }, packet);
    expect(result.success).toBe(true);
  });

  it("falls back deterministically after two invalid explanations", async () => {
    const fixture = clientFrom(["{}", "{}"]);
    const result = await explainPacket({ client: fixture.client, model: "m", packet: demoDecisionPackets[4] });
    expect(result.provider).toBe("fallback");
    expect(result.tier).toBe(demoDecisionPackets[4].tier);
    expect(result.citations).toContain(demoDecisionPackets[4].atoms.find((atom) => atom.status === "fail")?.id);
  });
});
