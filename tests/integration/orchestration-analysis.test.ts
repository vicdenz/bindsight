import { beforeEach, describe, expect, it } from "vitest";
import { POST as startRun } from "../../app/api/runs/route";
import { GET as getRun } from "../../app/api/runs/[runId]/route";
import { POST as compileAppetite } from "../../app/api/appetite/compile/route";
import { POST as diffAppetite } from "../../app/api/appetite/diff/route";
import { POST as simulatePortfolio } from "../../app/api/portfolio/simulate/route";
import { clearAnalysisRuns } from "../../lib/analysis/run-store";
import { decisionPacketSchema } from "../../lib/contracts";

beforeEach(clearAnalysisRuns);

describe("cached analysis orchestration", () => {
  it("creates and retrieves a complete run with all rules and tiers", async () => {
    const created = await startRun().json();
    expect(created.status).toBe("complete");
    expect(created.source).toBe("cached");
    expect(created.processed).toBe(5);
    expect(created.packets.every((packet: unknown) => decisionPacketSchema.parse(packet).atoms.length === 8)).toBe(true);
    expect(new Set(created.packets.map((packet: { tier: string }) => packet.tier))).toEqual(new Set(["review_now", "standard_review", "request_information", "manual_review", "outside_appetite"]));

    const response = await getRun(new Request("http://localhost"), { params: Promise.resolve({ runId: created.id }) });
    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe(created.id);
  });

  it("returns a prioritized next-best question for missing building year", async () => {
    const run = await startRun().json();
    const packet = run.packets.find((item: { submission: { id: string } }) => item.submission.id === "full-request-info");
    expect(packet.nextBestQuestion.field).toBe("buildingYear");
    expect(packet.nextBestQuestion.possibleTierChange).toBe(true);
  });

  it("compiles all eight fallback rules and exposes ambiguities", async () => {
    const response = await compileAppetite(new Request("http://localhost", { method: "POST", body: "{}" }));
    const body = await response.json();
    expect(body.rules).toHaveLength(8);
    expect(body.ambiguities).toHaveLength(3);
    expect(body.source).toBe("deterministic_fallback");
  });

  it("diffs the California target edit and simulates concentration", async () => {
    const diff = await diffAppetite().json();
    expect(diff.ruleChanges).toHaveLength(1);
    expect(diff.affectedPackets.map((item: { submissionId: string }) => item.submissionId)).toEqual(["full-review-now"]);

    const response = await simulatePortfolio(new Request("http://localhost", { method: "POST", body: JSON.stringify({ submissionId: "full-review-now" }) }));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.dimension).toBe("primaryState:CA");
    expect(result.after).toBeGreaterThan(result.before);
  });
});
