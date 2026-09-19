import { describe, expect, it } from "vitest";
import { validateToolCall, validateToolCycle } from "../../lib/openai/tools";

describe("reviewer read-only tools", () => {
  it("accepts narrow valid arguments", () => {
    expect(validateToolCall("get_decision_packet", { submission_id: "S-1" }))
      .toEqual({ name: "get_decision_packet", arguments: { submission_id: "S-1" } });
  });

  it("rejects unknown/write tools and extra arguments", () => {
    expect(() => validateToolCall("bind_policy", { submission_id: "S-1" })).toThrow(/read-only/);
    expect(() => validateToolCall("get_decision_packet", {
      submission_id: "S-1",
      mutate: true,
    })).toThrow();
  });

  it("caps a reviewer cycle at four calls", () => {
    const call = { name: "get_decision_packet", arguments: { submission_id: "S-1" } };
    expect(validateToolCycle([call, call, call, call])).toHaveLength(4);
    expect(() => validateToolCycle([call, call, call, call, call])).toThrow(/exceeds 4/);
  });
});
