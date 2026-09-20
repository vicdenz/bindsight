import type { ReviewerToolName } from "./tools";

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
