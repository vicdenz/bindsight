import { describe, expect, it, vi } from "vitest";
import { BasetenClient, BasetenOpenAITransport, mapConcurrent } from "../../lib/baseten/client";

describe("BasetenClient", () => {
  it("retries once and caches successful OpenAI-compatible completions", async () => {
    const complete = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue({ content: "{}" });
    const client = new BasetenClient({ complete }, { retries: 1 });
    const request = { model: "fixture-model", messages: [{ role: "user" as const, content: "fixed fixture" }] };
    await expect(client.complete(request)).resolves.toEqual({ content: "{}" });
    await expect(client.complete(request)).resolves.toEqual({ content: "{}" });
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("does not retry errors classified as non-retryable", async () => {
    const complete = vi.fn().mockRejectedValue(new Error("invalid request"));
    const client = new BasetenClient({ complete }, { retries: 2, retryable: () => false });
    await expect(client.complete({ model: "m", messages: [] })).rejects.toThrow("invalid request");
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("bounds batch concurrency and preserves order", async () => {
    let active = 0;
    let maximum = 0;
    const result = await mapConcurrent([3, 1, 2, 4], 2, async (value) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });
    expect(result).toEqual([6, 2, 4, 8]);
    expect(maximum).toBe(2);
  });
});

describe("BasetenOpenAITransport", () => {
  it("lowers requests to the configured OpenAI-compatible endpoint", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const transport = new BasetenOpenAITransport({
      apiKey: "test-key",
      baseUrl: "https://example.test/v1/",
      fetcher: async (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
        return new Response(JSON.stringify({
          model: "fixture-model",
          choices: [{ message: { content: "{\"ok\":true}" } }],
          usage: { prompt_tokens: 4, completion_tokens: 3 },
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });
    const result = await transport.complete({ model: "fixture-model", messages: [{ role: "user", content: "compile" }] });
    expect(capturedUrl).toBe("https://example.test/v1/chat/completions");
    expect((capturedInit?.headers as Record<string, string>).Authorization).toBe("Api-Key test-key");
    expect(result).toMatchObject({ content: "{\"ok\":true}", inputTokens: 4, outputTokens: 3 });
  });
});
