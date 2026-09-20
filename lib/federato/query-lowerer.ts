import type { QueryPlan } from "../contracts/query";
import type { FederatoSchema } from "./schema";
import { validateQueryPlan } from "./query-validator";
type WireOperator = "$eq" | "$ne" | "$in" | "$gt" | "$gte" | "$lt" | "$lte";
export type FederatoClause = Record<string, unknown>;
export type FederatoSelect = Record<string, true | Record<string, unknown>>;
export interface FederatoExpand { [field: string]: true | FederatoExpand }
export type FederatoQueryRequest = Readonly<{ resource: string; where?: FederatoClause; expand?: FederatoExpand; select?: FederatoSelect; pagination?: Readonly<{ limit: number; offset?: number }> }>;
const OPERATOR: Record<QueryPlan["filters"][number]["operator"], WireOperator> = { eq: "$eq", neq: "$ne", in: "$in", gt: "$gt", gte: "$gte", lt: "$lt", lte: "$lte" };
function projection(paths: readonly string[]): FederatoSelect { return Object.fromEntries(paths.map((path) => [path, true])); }

export function lowerQueryPlan(input: unknown, schema: FederatoSchema): FederatoQueryRequest {
  const result = validateQueryPlan(input, schema);
  if (!result.ok) throw new Error(`Invalid Federato query plan: ${result.message}`);
  const plan = result.plan;
  const clauses = plan.filters.map((filter) => ({ [filter.field]: filter.operator === "eq" ? filter.value : { [OPERATOR[filter.operator]]: filter.value } }));
  const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { $and: clauses };
  const expand = plan.expansions.length ? Object.fromEntries(plan.expansions.map((entry) => [entry.resource, true as const])) : undefined;
  const select: FederatoSelect = projection(plan.select);
  for (const entry of plan.expansions) select[entry.resource] = projection(entry.fields);
  if (plan.aggregation === "sum") {
    for (const key of Object.keys(select)) delete select[key];
    select.aggregationResult = { $sum: plan.select[0] };
  } else if (plan.aggregation === "count") {
    for (const key of Object.keys(select)) delete select[key];
    select.aggregationResult = { $count: true };
  }
  let offset: number | undefined;
  if (plan.pagination.cursor !== undefined) {
    offset = Number(plan.pagination.cursor);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid Federato query plan: pagination.cursor must encode a non-negative integer offset");
  }
  return { resource: plan.resource, ...(where ? { where } : {}), ...(expand ? { expand } : {}), select,
    pagination: { limit: plan.pagination.limit, ...(offset === undefined ? {} : { offset }) } };
}
