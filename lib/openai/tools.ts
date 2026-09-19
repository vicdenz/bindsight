import { z } from "zod";

const id = z.string().trim().min(1);

export const reviewerToolSchemas = {
  get_decision_packet: z.object({ submission_id: id }).strict(),
  inspect_evidence: z.object({ evidence_ids: z.array(id).min(1).max(50) }).strict(),
  inspect_rule: z.object({ rule_ids: z.array(id).min(1).max(50) }).strict(),
  compare_submissions: z.object({
    submission_ids: z.array(id).min(2).max(10),
    dimensions: z.array(id).min(1).max(10),
  }).strict(),
  simulate_counterfactual: z.object({
    submission_id: id,
    field: id,
    proposed_value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  }).strict(),
  diff_appetite_versions: z.object({ old_version: id, new_version: id }).strict(),
  draft_broker_question: z.object({ submission_id: id, missing_field: id }).strict(),
} as const;

export type ReviewerToolName = keyof typeof reviewerToolSchemas;

export interface ValidatedToolCall {
  name: ReviewerToolName;
  arguments: Record<string, unknown>;
}

export const MAX_REVIEWER_TOOL_CALLS = 4;

export function validateToolCall(
  name: string,
  args: unknown,
): ValidatedToolCall {
  if (!Object.hasOwn(reviewerToolSchemas, name)) {
    throw new Error(`Unknown or non-read-only reviewer tool: ${name}`);
  }
  const toolName = name as ReviewerToolName;
  return {
    name: toolName,
    arguments: reviewerToolSchemas[toolName].parse(args),
  };
}

export function validateToolCycle(
  calls: ReadonlyArray<{ name: string; arguments: unknown }>,
): ValidatedToolCall[] {
  if (calls.length > MAX_REVIEWER_TOOL_CALLS) {
    throw new Error(`Reviewer tool cycle exceeds ${MAX_REVIEWER_TOOL_CALLS} calls`);
  }
  return calls.map((call) => validateToolCall(call.name, call.arguments));
}
