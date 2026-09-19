import { describe, expect, it } from "vitest";
import { BudgetLedger, budgetConfigFromEnv } from "../../lib/openai/budget";

describe("OpenAI budget guard", () => {
  it("uses the required defaults and accepts configuration", () => {
    expect(budgetConfigFromEnv({})).toEqual({ maxRunUsd: 2, maxEventUsd: 50 });
    expect(budgetConfigFromEnv({ OPENAI_MAX_RUN_USD: "1.25", OPENAI_MAX_EVENT_USD: "12" }))
      .toEqual({ maxRunUsd: 1.25, maxEventUsd: 12 });
  });

  it("allows, downgrades, and refuses without spending on an estimate", () => {
    const ledger = new BudgetLedger({ maxRunUsd: 2, maxEventUsd: 50 });
    expect(ledger.decide({ requestedTier: "review", estimatedCostsUsd: { review: 1.5 } }).action)
      .toBe("allow");
    expect(ledger.spentUsd).toBe(0);

    expect(ledger.decide({
      requestedTier: "deep",
      estimatedCostsUsd: { deep: 2.5, review: 1.25, fast: 0.2 },
    })).toMatchObject({ action: "downgrade", tier: "review", requestedTier: "deep" });

    expect(ledger.decide({ requestedTier: "fast", estimatedCostsUsd: { fast: 2.01 } }).action)
      .toBe("refuse");
  });

  it("reconciles actual usage against the event cap", () => {
    const ledger = new BudgetLedger({ maxRunUsd: 2, maxEventUsd: 3 }, 2.5);
    expect(ledger.decide({ requestedTier: "review", estimatedCostsUsd: { review: 1, fast: 0.4 } }))
      .toMatchObject({ action: "downgrade", tier: "fast" });
    ledger.reconcile(0.5);
    expect(ledger.remainingUsd).toBe(0);
    expect(ledger.decide({ requestedTier: "fast", estimatedCostsUsd: { fast: 0 } }).action)
      .toBe("refuse");
  });
});
