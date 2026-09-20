import OpenAI from "openai";
import { z } from "zod";

import type { ReviewerToolName } from "./tools";
import { reviewerToolSchemas } from "./tools";

export interface ProviderToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export type ProviderTurn =
  | { role: "user"; content: string }
  | { role: "tool"; callId: string; name: ReviewerToolName; content: unknown };

export interface ReviewerProviderRequest {
  model: string;
  turns: readonly ProviderTurn[];
  allowedTools: readonly ReviewerToolName[];
  maxOutputTokens: number;
}

export interface ReviewerProviderResult {
  answer?: string;
  toolCalls?: ProviderToolCall[];
  citedIds?: string[];
  insufficientEvidence?: boolean;
  tokens: { input: number; output: number };
  costUsd: number;
}

export interface ReviewerProvider {
  respond(request: ReviewerProviderRequest): Promise<ReviewerProviderResult>;
}

export class UnavailableReviewerProvider implements ReviewerProvider {
  async respond(): Promise<ReviewerProviderResult> {
    throw new Error("OpenAI reviewer provider is not configured.");
  }
}

export interface OpenAIResponsesProviderOptions {
  apiKey: string;
  inputCostPerMillionUsd?: number;
  outputCostPerMillionUsd?: number;
}

const toolDescriptions: Record<ReviewerToolName, string> = {
  get_decision_packet: "Retrieve one completed deterministic decision packet.",
  inspect_evidence: "Inspect specific evidence items by stable ID.",
  inspect_rule: "Inspect deterministic rule outcomes by rule ID.",
  compare_submissions: "Compare completed packets on explicitly requested dimensions.",
  simulate_counterfactual: "Request a deterministic counterfactual calculation.",
  diff_appetite_versions: "Inspect differences between two compiled appetite versions.",
  draft_broker_question: "Retrieve the grounded next-best question for a missing field.",
};

function parametersFor(name: ReviewerToolName): Record<string, unknown> {
  const schema = { ...z.toJSONSchema(reviewerToolSchemas[name]) } as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

function citedIdsFrom(text: string): string[] {
  return [...text.matchAll(/\[([A-Za-z][A-Za-z0-9._:-]*)\]/g)].map((match) => match[1]);
}

export class OpenAIResponsesReviewerProvider implements ReviewerProvider {
  private readonly client: OpenAI;
  private readonly inputRate: number;
  private readonly outputRate: number;
  private previousResponseId?: string;
  private consumedToolTurns = 0;

  constructor(options: OpenAIResponsesProviderOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.inputRate = options.inputCostPerMillionUsd ?? 0;
    this.outputRate = options.outputCostPerMillionUsd ?? 0;
  }

  async respond(request: ReviewerProviderRequest): Promise<ReviewerProviderResult> {
    const tools = request.allowedTools.map((name) => ({
      type: "function" as const,
      name,
      description: toolDescriptions[name],
      parameters: parametersFor(name),
      strict: true,
    }));
    const toolTurns = request.turns.filter((turn) => turn.role === "tool");
    const newToolTurns = toolTurns.slice(this.consumedToolTurns);
    const input = this.previousResponseId
      ? newToolTurns.map((turn) => ({
          type: "function_call_output" as const,
          call_id: turn.role === "tool" ? turn.callId : "",
          output: JSON.stringify(turn.role === "tool" ? turn.content : null),
        }))
      : request.turns.find((turn) => turn.role === "user")?.content ?? "";

    const response = await this.client.responses.create({
      model: request.model,
      instructions: "You are BindSight's read-only senior underwriting reviewer. Retrieve evidence before factual answers. Never calculate or change an underwriting outcome yourself. Cite every factual claim in square brackets using only IDs returned in atomIds, evidenceIds, or calculationIds; a submission ID is context, not a valid citation. If evidence is unavailable, say insufficient evidence.",
      input,
      tools,
      tool_choice: "auto",
      parallel_tool_calls: false,
      max_output_tokens: request.maxOutputTokens,
      previous_response_id: this.previousResponseId,
      store: true,
    });
    this.previousResponseId = response.id;
    this.consumedToolTurns = toolTurns.length;

    const toolCalls = response.output.flatMap((item) => item.type === "function_call"
      ? [{ id: item.call_id, name: item.name, arguments: JSON.parse(item.arguments) as unknown }]
      : []);
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const answer = response.output_text?.trim();
    return {
      answer,
      toolCalls,
      citedIds: answer ? citedIdsFrom(answer) : [],
      insufficientEvidence: Boolean(answer && /insufficient evidence/i.test(answer)),
      tokens: { input: inputTokens, output: outputTokens },
      costUsd: inputTokens / 1_000_000 * this.inputRate + outputTokens / 1_000_000 * this.outputRate,
    };
  }
}
