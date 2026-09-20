import { describe, expect, it } from "vitest";
import { californiaTargetToAcceptableDiff } from "../../lib/analysis/appetite-studio";

describe("appetite version diff", () => {
  it("changes only the state rule and only California evidence", () => {
    const result = californiaTargetToAcceptableDiff();
    expect(result.ruleChanges.map((change) => change.ruleId)).toEqual(["R-STATE"]);
    expect(result.affectedPackets).toEqual([expect.objectContaining({ submissionId: "full-review-now", changedAtoms: ["R-STATE"] })]);
    const before = result.oldPackets.find((packet) => packet.submission.id === "full-review-now");
    const after = result.newPackets.find((packet) => packet.submission.id === "full-review-now");
    expect(before?.atoms.find((atom) => atom.ruleId === "R-STATE")?.status).toBe("target");
    expect(after?.atoms.find((atom) => atom.ruleId === "R-STATE")?.status).toBe("pass");
  });
});
