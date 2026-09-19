import { queryPlanSchema, type QueryPlan } from "../contracts/query";
import { FederatoSchemaGraph } from "./schema-graph";
import type { FederatoField, FederatoSchema } from "./schema";

export type QueryValidationIssue = {
  path: string;
  message: string;
};

export type QueryValidationResult =
  | { ok: true; plan: QueryPlan }
  | { ok: false; issues: QueryValidationIssue[]; message: string };

const FILTERABLE_SCALARS = new Set(["string", "number", "boolean", "date", "datetime"]);

function issue(path: string, message: string): QueryValidationIssue {
  return { path, message };
}

function expansionTarget(
  graph: FederatoSchemaGraph,
  root: string,
  relation: string,
): { resource: string; field: FederatoField } | { error: string } {
  const rootResource = graph.resource(root);
  if (!rootResource) return { error: `Unknown resource: ${root}` };
  const field = rootResource.fields[relation];
  if (!field) return { error: `Unknown expansion ${relation} on resource ${root}` };
  if (field.kind !== "reference") return { error: `Expansion ${relation} is not a reference` };
  if (!graph.resource(field.resource)) return { error: `Expansion ${relation} targets unknown resource ${field.resource}` };
  return { resource: field.resource, field };
}

export function validateQueryPlan(input: unknown, schema: FederatoSchema): QueryValidationResult {
  const parsed = queryPlanSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((entry) => issue(entry.path.join(".") || "plan", entry.message));
    return { ok: false, issues, message: issues.map((entry) => `${entry.path}: ${entry.message}`).join("; ") };
  }

  const plan = parsed.data;
  const graph = new FederatoSchemaGraph(schema);
  const issues: QueryValidationIssue[] = [];
  if (!graph.resource(plan.resource)) issues.push(issue("resource", `Unknown resource: ${plan.resource}`));

  plan.select.forEach((fieldPath, index) => {
    const resolution = graph.resolveField(plan.resource, fieldPath);
    if (!resolution.ok) issues.push(issue(`select.${index}`, resolution.message));
    else if (resolution.field.kind !== "scalar") issues.push(issue(`select.${index}`, `Selected field must be scalar: ${fieldPath}`));
  });

  plan.filters.forEach((filter, index) => {
    const resolution = graph.resolveField(plan.resource, filter.field);
    if (!resolution.ok) {
      issues.push(issue(`filters.${index}.field`, resolution.message));
      return;
    }
    if (resolution.field.kind !== "scalar" || !FILTERABLE_SCALARS.has(resolution.field.type)) {
      issues.push(issue(`filters.${index}.field`, `Filter field must be a supported scalar: ${filter.field}`));
      return;
    }
    if (filter.operator === "in" && !Array.isArray(filter.value)) {
      issues.push(issue(`filters.${index}.value`, "Operator in requires an array value"));
    }
    if (["gt", "gte", "lt", "lte"].includes(filter.operator) && !["number", "date", "datetime"].includes(resolution.field.type)) {
      issues.push(issue(`filters.${index}.operator`, `Operator ${filter.operator} is not supported for ${resolution.field.type}`));
    }
  });

  const seenExpansions = new Set<string>();
  plan.expansions.forEach((expansion, index) => {
    if (expansion.resource.includes(".")) {
      issues.push(issue(`expansions.${index}.resource`, "Nested expansion depth is not supported"));
      return;
    }
    if (seenExpansions.has(expansion.resource)) {
      issues.push(issue(`expansions.${index}.resource`, `Duplicate expansion: ${expansion.resource}`));
      return;
    }
    seenExpansions.add(expansion.resource);
    const target = expansionTarget(graph, plan.resource, expansion.resource);
    if ("error" in target) {
      issues.push(issue(`expansions.${index}.resource`, target.error));
      return;
    }
    expansion.fields.forEach((fieldName, fieldIndex) => {
      const resolution = graph.resolveField(target.resource, fieldName);
      if (!resolution.ok) issues.push(issue(`expansions.${index}.fields.${fieldIndex}`, resolution.message));
      else if (resolution.field.kind !== "scalar") {
        issues.push(issue(`expansions.${index}.fields.${fieldIndex}`, `Expanded field must be scalar: ${fieldName}`));
      }
    });
  });

  if (plan.aggregation === "sum") {
    if (plan.select.length !== 1) issues.push(issue("aggregation", "sum requires exactly one selected field"));
    else {
      const resolution = graph.resolveField(plan.resource, plan.select[0]);
      if (resolution.ok && (resolution.field.kind !== "scalar" || resolution.field.type !== "number")) {
        issues.push(issue("aggregation", "sum requires a numeric selected field"));
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues, message: issues.map((entry) => `${entry.path}: ${entry.message}`).join("; ") };
  }
  return { ok: true, plan };
}
