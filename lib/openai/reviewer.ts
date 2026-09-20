import type { DecisionPacket, ReviewerResponse } from "../contracts";
import { BudgetLedger, type ReviewerModelTier } from "./budget";
import { validateReviewerCitations } from "./citations";
import type { ProviderTurn, ReviewerProvider } from "./client";
import {
  MAX_REVIEWER_TOOL_CALLS,
  reviewerToolSchemas,
  validateToolCall,
  type ReviewerToolName,
  type ValidatedToolCall,
} from "./tools";

export interface ReviewerModels {
  fast: string;
  review: string;
  deep: string;
}

export interface ReviewerRuntimeOptions {
  provider: ReviewerProvider;
  packets: readonly DecisionPacket[];
  ledger?: BudgetLedger;
  models?: ReviewerModels;
  estimatedCostsUsd?: Record<ReviewerModelTier, number>;
}

const defaultModels: ReviewerModels = {
  fast: "gpt-5.6-luna",
  review: "gpt-5.6-terra",
  deep: "gpt-6-astra",
};

const allowedTools = Object.keys(reviewerToolSchemas) as ReviewerToolName[];

export function routeReviewerQuestion(question: string): ReviewerModelTier {
  const normalized = question.toLowerCase();
  if (/counterfactual|challenge|ambig|appetite version/.test(normalized)) return "deep";
  if (/compare|versus| vs\.? |rank|why .* above/.test(normalized)) return "review";
  return "fast";
}

function fallback(reason: string, model = "deterministic-fallback"): ReviewerResponse {
  return {
    answer: `Insufficient evidence: ${reason}`,
    toolCalls: [],
    citedIds: [],
    insufficientEvidence: true,
    provider: "openai",
    model,
    tokens: { input: 0, output: 0 },
    estimatedCostUsd: 0,
    validation: { valid: true, errors: [] },
  };
}

function packetSummary(packet: DecisionPacket) {
  return {
    submission: packet.submission,
    tier: packet.tier,
    score: packet.score,
    explanation: packet.explanation,
    atomIds: packet.atoms.map((atom) => atom.id),
    evidenceIds: packet.evidence.map((item) => item.id),
    calculationIds: packet.calculations.map((item) => item.id),
  };
}

function executeTool(call: ValidatedToolCall, packets: readonly DecisionPacket[]): unknown {
  const args = call.arguments;
  switch (call.name) {
    case "get_decision_packet": {
      const packet = packets.find((item) => item.submission.id === args.submission_id);
      return packet ? packetSummary(packet) : { insufficientEvidence: true };
    }
    case "inspect_evidence": {
      const ids = new Set(args.evidence_ids as string[]);
      return packets.flatMap((packet) => packet.evidence).filter((item) => ids.has(item.id));
    }
    case "inspect_rule": {
      const ids = new Set(args.rule_ids as string[]);
      return packets.flatMap((packet) => packet.atoms)
        .filter((atom) => ids.has(atom.ruleId))
        .map((atom) => ({ ruleId: atom.ruleId, status: atom.status, reason: atom.reason }));
    }
    case "compare_submissions": {
      const ids = args.submission_ids as string[];
      return ids.map((id) => {
        const packet = packets.find((item) => item.submission.id === id);
        return packet ? packetSummary(packet) : { submissionId: id, insufficientEvidence: true };
      });
    }
    case "draft_broker_question": {
      const packet = packets.find((item) => item.submission.id === args.submission_id);
      if (!packet?.nextBestQuestion || packet.nextBestQuestion.field !== args.missing_field) {
        return { insufficientEvidence: true };
      }
      return packet.nextBestQuestion;
    }
    case "simulate_counterfactual":
      return {
        insufficientEvidence: true,
        reason: "No deterministic counterfactual evaluator is registered for this runtime.",
      };
    case "diff_appetite_versions":
      return {
        insufficientEvidence: true,
        reason: "The supplied cached packets do not contain both requested appetite versions.",
      };
  }
}

export async function runReviewer(
  question: string,
  options: ReviewerRuntimeOptions,
): Promise<ReviewerResponse> {
  const trimmed = question.trim();
  if (!trimmed) return fallback("A reviewer question is required.");

  const ledger = options.ledger ?? new BudgetLedger();
  const requestedTier = routeReviewerQuestion(trimmed);
  const budget = ledger.decide({
    requestedTier,
    estimatedCostsUsd: options.estimatedCostsUsd ?? { fast: 0.05, review: 0.25, deep: 1 },
  });
  if (budget.action === "refuse") return fallback(budget.reason, "budget-refusal");

  const models = options.models ?? defaultModels;
  const model = models[budget.tier];
  const turns: ProviderTurn[] = [{ role: "user", content: trimmed }];
  const recordedCalls: ReviewerResponse["toolCalls"] = [];
  const tokens = { input: 0, output: 0 };
  let costUsd = 0;

  try {
    while (true) {
      const result = await options.provider.respond({
        model,
        turns,
        allowedTools,
        maxOutputTokens: 500,
      });
      tokens.input += result.tokens.input;
      tokens.output += result.tokens.output;
      costUsd += result.costUsd;
      ledger.reconcile(result.costUsd);

      const calls = result.toolCalls ?? [];
      if (calls.length > 0) {
        if (recordedCalls.length + calls.length > MAX_REVIEWER_TOOL_CALLS) {
          return fallback(`Reviewer exceeded the ${MAX_REVIEWER_TOOL_CALLS}-tool limit.`, model);
        }
        for (const rawCall of calls) {
          const call = validateToolCall(rawCall.name, rawCall.arguments);
          recordedCalls.push({ name: call.name, arguments: call.arguments });
          turns.push({
            role: "tool",
            callId: rawCall.id,
            name: call.name,
            content: executeTool(call, options.packets),
          });
        }
        continue;
      }

      const draft = {
        answer: result.answer?.trim() || "Insufficient evidence.",
        citedIds: result.citedIds ?? [],
        insufficientEvidence: result.insufficientEvidence ?? !result.answer,
      };
      const citations = validateReviewerCitations(draft, options.packets);
      if (!citations.valid) {
        return {
          ...fallback("The reviewer returned citations that could not be validated.", model),
          toolCalls: recordedCalls,
          tokens,
          estimatedCostUsd: costUsd,
          validation: { valid: false, errors: citations.errors },
        };
      }
      return {
        ...draft,
        toolCalls: recordedCalls,
        provider: "openai",
        model,
        tokens,
        estimatedCostUsd: costUsd,
        validation: { valid: true, errors: [] },
      };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Reviewer provider failed.";
    return fallback(reason, model);
  }
}
