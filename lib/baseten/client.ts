import { createHash } from "node:crypto";

export type BasetenMessage = { role: "system" | "user" | "assistant"; content: string };
export type BasetenCompletionRequest = {
  model: string;
  messages: BasetenMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
};
export type BasetenCompletion = { content: string; model?: string; inputTokens?: number; outputTokens?: number };
export interface BasetenTransport { complete(request: BasetenCompletionRequest): Promise<BasetenCompletion> }

export type BasetenClientOptions = { retries?: number; cache?: Map<string, BasetenCompletion>; retryable?: (error: unknown) => boolean };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export class BasetenClient {
  private readonly retries: number;
  private readonly cache: Map<string, BasetenCompletion>;
  private readonly retryable: (error: unknown) => boolean;

  constructor(private readonly transport: BasetenTransport, options: BasetenClientOptions = {}) {
    this.retries = options.retries ?? 1;
    this.cache = options.cache ?? new Map();
    this.retryable = options.retryable ?? (() => true);
  }

  async complete(request: BasetenCompletionRequest, options: { cache?: boolean } = {}): Promise<BasetenCompletion> {
    const cacheEnabled = options.cache ?? true;
    const key = createHash("sha256").update(stable(request)).digest("hex");
    const cached = cacheEnabled ? this.cache.get(key) : undefined;
    if (cached) return cached;
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const result = await this.transport.complete(request);
        if (cacheEnabled) this.cache.set(key, result);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt === this.retries || !this.retryable(error)) throw error;
      }
    }
    throw lastError;
  }
}

export async function mapConcurrent<T, U>(items: readonly T[], concurrency: number, work: (item: T, index: number) => Promise<U>): Promise<U[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError("concurrency must be a positive integer");
  const results = new Array<U>(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await work(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
