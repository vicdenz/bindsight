import { queryPlanSchema, type QueryPlan } from "../contracts/query";
import type { FederatoSchema } from "../federato/schema";
import { validateQueryPlan } from "../federato/query-validator";
import { BasetenClient, type BasetenMessage } from "./client";

function parseJson(content: string): unknown { try { return JSON.parse(content); } catch { return undefined; } }

export type QueryPlanningResult = { plan: QueryPlan; revisions: number };
export async function planQuery(input: {
  client: BasetenClient; model: string; schema: FederatoSchema; evidenceGoals: string[]; maxRevisions?: number;
}): Promise<QueryPlanningResult> {
  const maxRevisions = Math.min(2, Math.max(0, input.maxRevisions ?? 2));
  const messages: BasetenMessage[] = [
    { role: "system" as const, content: "Return one declarative QueryPlan JSON object. Use only schema resources and fields. Arrays require expansions; pagination must be bounded." },
    { role: "user" as const, content: JSON.stringify({ schema: input.schema, evidenceGoals: input.evidenceGoals }) },
  ];
  for (let revision = 0; revision <= maxRevisions; revision += 1) {
    const result = await input.client.complete({ model: input.model, messages, temperature: 0, responseFormat: { type: "json_object" } }, { cache: revision === 0 });
    const shape = queryPlanSchema.safeParse(parseJson(result.content));
    const validation = shape.success ? validateQueryPlan(shape.data, input.schema) : undefined;
    if (shape.success && validation?.ok) return { plan: validation.plan, revisions: revision };
    const errors = shape.success
      ? validation && !validation.ok ? validation.message : "Unknown plan validation error"
      : shape.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    messages.push({ role: "assistant", content: result.content });
    messages.push({ role: "user", content: `Revise only the invalid plan using this validator feedback: ${errors}` });
  }
  throw new Error(`Baseten query planning failed after ${maxRevisions} revisions`);
}
