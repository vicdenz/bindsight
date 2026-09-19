import type { QueryPlan } from "../contracts/query";
import type { FederatoSchema } from "./schema";
import { validateQueryPlan } from "./query-validator";

/** Canonical transport input. A transport owns serialization to the verified Federato wire shape. */
export type FederatoQueryRequest = Readonly<{
  resource: string;
  fields: readonly string[];
  filters: ReadonlyArray<Readonly<{ field: string; operator: QueryPlan["filters"][number]["operator"]; value: unknown }>>;
  expansions: ReadonlyArray<Readonly<{ relation: string; fields: readonly string[] }>>;
  page: Readonly<{ limit: number; cursor?: string }>;
  aggregation: QueryPlan["aggregation"];
}>;

export function lowerQueryPlan(input: unknown, schema: FederatoSchema): FederatoQueryRequest {
  const result = validateQueryPlan(input, schema);
  if (!result.ok) throw new Error(`Invalid Federato query plan: ${result.message}`);
  const plan = result.plan;
  return {
    resource: plan.resource,
    fields: [...plan.select],
    filters: plan.filters.map((filter) => ({ ...filter })),
    expansions: plan.expansions.map((expansion) => ({ relation: expansion.resource, fields: [...expansion.fields] })),
    page: { ...plan.pagination },
    aggregation: plan.aggregation,
  };
}
