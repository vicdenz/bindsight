import { describe, expect, it } from "vitest";
import { sanitizedFederatoSchema } from "../../fixtures/federato/schema";
import { validPolicyPlan } from "../../fixtures/federato/plans";
import { validateQueryPlan } from "../../lib/federato/query-validator";

describe("query plan adversarial fixtures", () => {
  const cases = [
    { label: "unknown resource", patch: { resource: "Unknown" } },
    { label: "unknown field", patch: { select: ["unknown"] } },
    { label: "unbounded pagination", patch: { pagination: { limit: 101 } } },
    { label: "unsupported operator", patch: { filters: [{ field: "premium", operator: "regex", value: ".*" }] } },
    { label: "array dot traversal", patch: { select: ["locations.state"] } },
    { label: "missing reference expansion", patch: { expansions: [{ resource: "losses", fields: ["id"] }] } },
    { label: "invalid aggregation", patch: { select: ["accountName"], expansions: [], aggregation: "sum" } },
    { label: "excessive expansion depth", patch: { expansions: [{ resource: "locations.buildings", fields: ["yearBuilt"] }] } },
  ];

  it.each(cases)("rejects $label", ({ patch }) => {
    expect(validateQueryPlan({ ...validPolicyPlan, ...patch }, sanitizedFederatoSchema).ok).toBe(false);
  });

  it("accepts the frozen valid fixture", () => {
    expect(validateQueryPlan(validPolicyPlan, sanitizedFederatoSchema)).toEqual({ ok: true, plan: validPolicyPlan });
  });
});
