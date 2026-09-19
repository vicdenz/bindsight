import { z } from "zod";

export const queryPlanSchema = z.object({
  resource: z.string().min(1),
  select: z.array(z.string().min(1)).min(1),
  filters: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(["eq", "neq", "in", "gt", "gte", "lt", "lte"]),
    value: z.unknown(),
  })),
  expansions: z.array(z.object({ resource: z.string(), fields: z.array(z.string()) })).max(4),
  pagination: z.object({ limit: z.number().int().min(1).max(100), cursor: z.string().optional() }),
  aggregation: z.enum(["none", "sum", "count"]).default("none"),
  purpose: z.string().min(1),
  expectedEvidence: z.array(z.string().min(1)),
});

export type QueryPlan = z.infer<typeof queryPlanSchema>;
