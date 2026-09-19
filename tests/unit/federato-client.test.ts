import { describe, expect, it, vi } from "vitest";
import { sanitizedFederatoSchema } from "../../fixtures/federato/schema";
import { validPolicyPlan } from "../../fixtures/federato/plans";
import type { FederatoTokenProvider } from "../../lib/federato/auth";
import { FederatoClient, FederatoClientError, type FederatoTransport } from "../../lib/federato/client";
import { lowerQueryPlan } from "../../lib/federato/query-lowerer";

const request = lowerQueryPlan(validPolicyPlan, sanitizedFederatoSchema);

function tokenProvider(): FederatoTokenProvider {
  return {
    getToken: vi.fn(async (options?: { forceRefresh?: boolean }) => ({
      value: options?.forceRefresh ? "refreshed" : "initial",
      expiresAt: Date.now() + 60_000,
    })),
  };
}

describe("FederatoClient", () => {
  it("refreshes once after 401 and then succeeds", async () => {
    const tokens = tokenProvider();
    const query = vi.fn()
      .mockResolvedValueOnce({ status: 401, message: "expired" })
      .mockResolvedValueOnce({ status: 200, data: [{ id: "p-1" }] });
    const transport: FederatoTransport = {
      discoverSchema: vi.fn(),
      query,
    };

    const result = await new FederatoClient(tokens, transport).query(request);
    expect(result).toEqual([{ id: "p-1" }]);
    expect(query).toHaveBeenCalledTimes(2);
    expect(tokens.getToken).toHaveBeenNthCalledWith(2, { forceRefresh: true });
  });

  it("never attempts a second refresh", async () => {
    const tokens = tokenProvider();
    const transport: FederatoTransport = {
      discoverSchema: vi.fn(),
      query: vi.fn().mockResolvedValue({ status: 401, message: "still unauthorized" }),
    };
    await expect(new FederatoClient(tokens, transport).query(request)).rejects.toEqual(
      expect.objectContaining({ name: "FederatoClientError", message: "still unauthorized", status: 401 }),
    );
    expect(tokens.getToken).toHaveBeenCalledTimes(2);
    expect(transport.query).toHaveBeenCalledTimes(2);
  });

  it("uses an injected cached fallback on transport failure", async () => {
    const transport: FederatoTransport = {
      discoverSchema: vi.fn().mockRejectedValue(new Error("timeout")),
      query: vi.fn().mockRejectedValue(new Error("timeout")),
    };
    const client = new FederatoClient(tokenProvider(), transport, {
      schema: async () => sanitizedFederatoSchema,
      query: async () => [{ id: "cached" }],
    });
    await expect(client.discoverSchema()).resolves.toBe(sanitizedFederatoSchema);
    await expect(client.query(request)).resolves.toEqual([{ id: "cached" }]);
  });

  it("preserves plain provider messages", async () => {
    const transport: FederatoTransport = {
      discoverSchema: vi.fn(),
      query: vi.fn().mockResolvedValue({ status: 400, message: "field is unavailable" }),
    };
    await expect(new FederatoClient(tokenProvider(), transport).query(request)).rejects.toEqual(
      new FederatoClientError("field is unavailable", 400),
    );
  });
});
