import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/analysis/live", async () => {
  const cache = await import("../../lib/cache/analysis");
  return {
    getDecisionData: async () => {
      const data = cache.analyzeCachedSubmissions();
      return {
        ...data,
        schemaVersion: "1.0" as const,
        generatedAt: "2026-09-19T12:00:00.000Z",
        summary: {
          total: data.packets.length,
          cohorts: { evaluated: data.packets.length, renewal: 0, unsupported_line: 0 },
          tiers: Object.fromEntries(data.packets.map((packet) => [packet.tier, 1])),
          assessmentMode: "demo" as const,
        },
        profiles: [],
      };
    },
    getDecisionPacket: async (id: string) => ({ packet: cache.getCachedDecisionPacket(id), source: "cached" as const }),
  };
});

import { POST } from "../../app/api/analyze/route";
import { GET } from "../../app/api/submissions/[submissionId]/decision/route";
import { decisionPacketSchema } from "../../lib/contracts";

describe("fixture-backed analysis API", () => {
  it("returns five valid cached packets spanning every action tier", async () => {
    const response = await POST();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("X-BindSight-Schema-Version")).toBe("1.0");
    expect(body.source).toBe("cached");
    expect(body.packets).toHaveLength(5);
    expect(body.packets.map((packet: unknown) => decisionPacketSchema.parse(packet).tier)).toEqual([
      "review_now", "standard_review", "request_information", "manual_review", "outside_appetite",
    ]);
    expect(body.packets.every((packet: { analysis: { source: string } }) => packet.analysis.source === "cached")).toBe(true);
    expect(body.summary).toMatchObject({ total: 5, assessmentMode: "demo" });
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
