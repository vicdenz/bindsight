import { describe, expect, it } from "vitest";

import { POST } from "../../app/api/analyze/route";
import { GET } from "../../app/api/submissions/[submissionId]/decision/route";
import { decisionPacketSchema } from "../../lib/contracts";

describe("fixture-backed analysis API", () => {
  it("returns five valid cached packets spanning every action tier", async () => {
    const response = POST();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.source).toBe("cached");
    expect(body.packets).toHaveLength(5);
    expect(body.packets.map((packet: unknown) => decisionPacketSchema.parse(packet).tier)).toEqual([
      "review_now", "standard_review", "request_information", "manual_review", "likely_decline",
    ]);
    expect(body.packets.every((packet: { analysis: { source: string } }) => packet.analysis.source === "cached")).toBe(true);
  });

  it("returns a packet by submission ID", async () => {
    const response = await GET(new Request("http://localhost/api/submissions/sub-review-now/decision"), {
      params: Promise.resolve({ submissionId: "sub-review-now" }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(decisionPacketSchema.parse(body).submission.id).toBe("sub-review-now");
  });

  it("returns a cached 404 without fabricating a packet", async () => {
    const response = await GET(new Request("http://localhost/api/submissions/unknown/decision"), {
      params: Promise.resolve({ submissionId: "unknown" }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Decision packet not found", submissionId: "unknown", source: "cached" });
  });
});
