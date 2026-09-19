import type { QueryPlan } from "../../lib/contracts/query";

export const validPolicyPlan: QueryPlan = {
  resource: "Policy",
  select: ["id", "accountName", "premium"],
  filters: [{ field: "premium", operator: "gte", value: 50_000 }],
  expansions: [{ resource: "locations", fields: ["id", "state", "tiv"] }],
  pagination: { limit: 50 },
  aggregation: "none",
  purpose: "Stage A sanitized fixture",
  expectedEvidence: ["policy identity", "premium", "location state"],
};
