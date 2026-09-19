import { describe, expect, it } from "vitest";
import { BudgetLedger } from "../../lib/openai/budget";

describe("OpenAI event cap audit", () => {
  it("never authorizes an estimate over either cap", () => {
    const ledger = new BudgetLedger({ maxRunUsd: 2, maxEventUsd: 50 }, 49.9);
    const decision = ledger.decide({
      requestedTier: "deep",
      estimatedCostsUsd: { deep: 3, review: 1, fast: 0.11 },
    });
    expect(decision.action).toBe("refuse");
  });

  it("selects the highest requested-or-lower tier that fits", () => {
    const ledger = new BudgetLedger({ maxRunUsd: 2, maxEventUsd: 50 }, 49);
    expect(ledger.decide({
      requestedTier: "deep",
      estimatedCostsUsd: { deep: 2.1, review: 1.1, fast: 0.5 },
    })).toMatchObject({ action: "downgrade", tier: "fast", estimatedCostUsd: 0.5 });
  });
});
