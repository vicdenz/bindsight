import { describe, expect, it } from "vitest";

import { redactTelemetry } from "../../lib/observability/redaction";

describe("telemetry redaction", () => {
  it("removes secrets recursively without mutating safe metadata", () => {
    expect(redactTelemetry({ submissionId: "s-1", headers: { authorization: "Bearer secret" }, apiKey: "secret" })).toEqual({
      submissionId: "s-1",
      headers: { authorization: "[redacted]" },
      apiKey: "[redacted]",
    });
  });

  it("bounds long strings and circular structures", () => {
    const value: Record<string, unknown> = { message: "x".repeat(300) };
    value.self = value;
    expect(redactTelemetry(value)).toEqual({ message: `${"x".repeat(256)}…[truncated]`, self: "[circular]" });
  });
});
