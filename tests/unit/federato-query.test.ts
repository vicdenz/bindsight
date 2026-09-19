import { describe, expect, it } from "vitest";
import { sanitizedFederatoSchema } from "../../fixtures/federato/schema";
import { validPolicyPlan } from "../../fixtures/federato/plans";
import { lowerQueryPlan } from "../../lib/federato/query-lowerer";
import { validateQueryPlan } from "../../lib/federato/query-validator";

function changed(overrides: Partial<typeof validPolicyPlan>) {
  return { ...validPolicyPlan, ...overrides };
}

describe("Federato query validation", () => {
  it("accepts and lowers a schema-backed plan", () => {
    const result = validateQueryPlan(validPolicyPlan, sanitizedFederatoSchema);
    expect(result.ok).toBe(true);
    expect(lowerQueryPlan(validPolicyPlan, sanitizedFederatoSchema)).toMatchObject({
      resource: "Policy",
      where: { premium: { $gte: 50_000 } },
      expand: { locations: true },
      select: { id: true, accountName: true, premium: true, locations: { id: true, state: true, tiv: true } },
      pagination: { limit: 50 },
    });
  });

  it.each([
    ["unknown resource", changed({ resource: "Claim" }), "Unknown resource"],
    ["unknown field", changed({ select: ["id", "secretField"] }), "Unknown field"],
    ["scalar traversal", changed({ select: ["accountName.value"] }), "Cannot traverse scalar"],
    ["array traversal", changed({ select: ["locations.state"] }), "Cannot traverse array"],
    ["missing expansion", changed({ expansions: [{ resource: "claims", fields: ["id"] }] }), "Unknown expansion"],
    ["nested expansion", changed({ expansions: [{ resource: "locations.buildings", fields: ["id"] }] }), "Nested expansion"],
    ["bad expanded field", changed({ expansions: [{ resource: "locations", fields: ["postcode"] }] }), "Unknown field"],
    ["duplicate expansion", changed({ expansions: [{ resource: "locations", fields: ["id"] }, { resource: "locations", fields: ["state"] }] }), "Duplicate expansion"],
    ["invalid aggregation field", changed({ select: ["accountName"], expansions: [], aggregation: "sum" }), "numeric"],
    ["invalid aggregation arity", changed({ select: ["premium", "id"], expansions: [], aggregation: "sum" }), "exactly one"],
    ["invalid in value", changed({ filters: [{ field: "premium", operator: "in", value: 50_000 }] }), "array value"],
    ["invalid ordered operator", changed({ filters: [{ field: "accountName", operator: "gt", value: "A" }] }), "not supported"],
  ])("rejects %s with a plain message", (_name, plan, expected) => {
    const result = validateQueryPlan(plan, sanitizedFederatoSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(expected);
      expect(result.message).not.toContain("[object Object]");
    }
  });

  it("rejects unknown operators and unbounded pagination at the contract boundary", () => {
    const result = validateQueryPlan(changed({
      filters: [{ field: "premium", operator: "contains", value: "5" } as never],
      pagination: { limit: 10_000 },
    }), sanitizedFederatoSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/Invalid option|Too big/);
  });

  it("does not mutate the source plan while lowering", () => {
    const before = structuredClone(validPolicyPlan);
    const lowered = lowerQueryPlan(validPolicyPlan, sanitizedFederatoSchema);
    expect(validPolicyPlan).toEqual(before);
    expect(lowered.select).not.toBe(validPolicyPlan.select);
  });

  it("maps internal cursor pagination to the documented offset", () => {
    expect(lowerQueryPlan(changed({ pagination: { limit: 10, cursor: "20" } }), sanitizedFederatoSchema).pagination)
      .toEqual({ limit: 10, offset: 20 });
    expect(() => lowerQueryPlan(changed({ pagination: { limit: 10, cursor: "opaque" } }), sanitizedFederatoSchema))
      .toThrow("non-negative integer offset");
  });

  it("allows documented dot paths through embedded objects", () => {
    expect(validateQueryPlan(changed({ select: ["dates.effective"], expansions: [] }), sanitizedFederatoSchema).ok).toBe(true);
  });
});
