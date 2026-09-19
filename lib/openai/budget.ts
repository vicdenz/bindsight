export const DEFAULT_MAX_RUN_USD = 2;
export const DEFAULT_MAX_EVENT_USD = 50;

export type ReviewerModelTier = "fast" | "review" | "deep";

export interface BudgetConfig {
  maxRunUsd: number;
  maxEventUsd: number;
}

export interface BudgetRequest {
  requestedTier: ReviewerModelTier;
  estimatedCostsUsd: Partial<Record<ReviewerModelTier, number>>;
}

export type BudgetDecision =
  | { action: "allow"; tier: ReviewerModelTier; estimatedCostUsd: number }
  | {
      action: "downgrade";
      tier: ReviewerModelTier;
      requestedTier: ReviewerModelTier;
      estimatedCostUsd: number;
      reason: string;
    }
  | { action: "refuse"; reason: string };

const tierOrder: readonly ReviewerModelTier[] = ["fast", "review", "deep"];

function finiteNonnegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite nonnegative number`);
  }
  return value;
}

export function budgetConfigFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): BudgetConfig {
  const parse = (key: string, fallback: number) => {
    const raw = env[key];
    if (raw === undefined || raw.trim() === "") return fallback;
    return finiteNonnegative(Number(raw), key);
  };

  return {
    maxRunUsd: parse("OPENAI_MAX_RUN_USD", DEFAULT_MAX_RUN_USD),
    maxEventUsd: parse("OPENAI_MAX_EVENT_USD", DEFAULT_MAX_EVENT_USD),
  };
}

export class BudgetLedger {
  readonly config: BudgetConfig;
  #spentUsd: number;

  constructor(config: BudgetConfig = budgetConfigFromEnv(), initialSpentUsd = 0) {
    this.config = {
      maxRunUsd: finiteNonnegative(config.maxRunUsd, "maxRunUsd"),
      maxEventUsd: finiteNonnegative(config.maxEventUsd, "maxEventUsd"),
    };
    this.#spentUsd = finiteNonnegative(initialSpentUsd, "initialSpentUsd");
  }

  get spentUsd(): number {
    return this.#spentUsd;
  }

  get remainingUsd(): number {
    return Math.max(0, this.config.maxEventUsd - this.#spentUsd);
  }

  decide(request: BudgetRequest): BudgetDecision {
    if (this.remainingUsd <= 0) {
      return { action: "refuse", reason: "OpenAI event budget is exhausted." };
    }

    const requestedIndex = tierOrder.indexOf(request.requestedTier);
    const candidates = tierOrder.slice(0, requestedIndex + 1).reverse();

    for (const tier of candidates) {
      const estimate = request.estimatedCostsUsd[tier];
      if (estimate === undefined) continue;
      finiteNonnegative(estimate, `estimatedCostsUsd.${tier}`);
      if (estimate <= this.config.maxRunUsd && estimate <= this.remainingUsd) {
        if (tier === request.requestedTier) {
          return { action: "allow", tier, estimatedCostUsd: estimate };
        }
        return {
          action: "downgrade",
          tier,
          requestedTier: request.requestedTier,
          estimatedCostUsd: estimate,
          reason: "Requested model exceeds the run or remaining event budget.",
        };
      }
    }

    return {
      action: "refuse",
      reason: "No configured reviewer model fits the run and remaining event budgets.",
    };
  }

  reconcile(actualCostUsd: number): void {
    this.#spentUsd += finiteNonnegative(actualCostUsd, "actualCostUsd");
  }
}
