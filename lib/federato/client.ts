import type { FetchLike, FederatoTokenProvider } from "./auth";
import type { FederatoQueryRequest } from "./query-lowerer";
import { normalizeFederatoSchema, type FederatoSchema } from "./schema";

export type FederatoTransportResult<T> = { status: number; data?: T; message?: string };
export interface FederatoTransport {
  discoverSchema(token: string): Promise<FederatoTransportResult<FederatoSchema>>;
  query<T>(token: string, request: FederatoQueryRequest): Promise<FederatoTransportResult<T>>;
}
export interface FederatoFallback { schema?(): Promise<FederatoSchema | undefined>; query?(request: FederatoQueryRequest): Promise<unknown | undefined> }
export type FederatoQueryPage<T> = { total: number; records: T[]; groups?: T[] };

export class FederatoClientError extends Error {
  constructor(message: string, readonly status?: number) { super(message); this.name = "FederatoClientError"; }
}

function unwrapWorkflowEnvelope(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body) || !("output" in body)) return body;
  const output = (body as { output?: unknown }).output;
  if (!Array.isArray(output) || output.length !== 1 || !output[0] || typeof output[0] !== "object") return body;
  return (output[0] as { data?: unknown }).data;
}

export function normalizeQueryPage<T>(input: unknown): FederatoQueryPage<T> {
  if (Array.isArray(input)) return { total: input.length, records: input as T[] };
  if (!input || typeof input !== "object") throw new Error("Federato query response must be an array or object");
  const value = input as Record<string, unknown>;
  if (typeof value.total !== "number" || !Number.isFinite(value.total) || value.total < 0) throw new Error("Federato query response total must be a non-negative number");
  if (Array.isArray(value.groups)) return { total: value.total, records: value.groups as T[], groups: value.groups as T[] };
  const records = Array.isArray(value.records) ? value.records : Array.isArray(value.data) ? value.data : undefined;
  if (!records) throw new Error("Federato query response must contain records, data, or groups");
  return { total: value.total, records: records as T[] };
}

export class HttpFederatoTransport implements FederatoTransport {
  constructor(private readonly handlerUrl: string, private readonly fetcher: FetchLike = fetch) {}
  async discoverSchema(token: string): Promise<FederatoTransportResult<FederatoSchema>> {
    const result = await this.post(token, { action: "schema" });
    if (result.status < 200 || result.status >= 300 || result.data === undefined) return { status: result.status, message: result.message };
    try { return { status: result.status, data: normalizeFederatoSchema(result.data) }; }
    catch (error) { return { status: result.status, message: error instanceof Error ? error.message : "Invalid schema response" }; }
  }
  async query<T>(token: string, request: FederatoQueryRequest): Promise<FederatoTransportResult<T>> {
    return this.post(token, { action: "query", payload: request }) as Promise<FederatoTransportResult<T>>;
  }
  private async post(token: string, envelope: { action: "schema" } | { action: "query"; payload: FederatoQueryRequest }): Promise<FederatoTransportResult<unknown>> {
    const response = await this.fetcher(this.handlerUrl, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(envelope) });
    const body: unknown = await response.json().catch(async () => response.text().catch(() => undefined));
    if (!response.ok) return { status: response.status, message: typeof body === "string" ? body : `Federato request failed with status ${response.status}` };
    return { status: response.status, data: unwrapWorkflowEnvelope(body) };
  }
}

export class FederatoClient {
  constructor(private readonly tokens: FederatoTokenProvider, private readonly transport: FederatoTransport, private readonly fallback?: FederatoFallback) {}
  async discoverSchema(): Promise<FederatoSchema> {
    try { return await this.withOneRefresh((token) => this.transport.discoverSchema(token)); }
    catch (error) { const cached = await this.fallback?.schema?.(); if (cached) return cached; throw error; }
  }
  async query<T>(request: FederatoQueryRequest): Promise<T> {
    try { return await this.withOneRefresh((token) => this.transport.query<T>(token, request)); }
    catch (error) { const cached = await this.fallback?.query?.(request); if (cached !== undefined) return cached as T; throw error; }
  }
  private async withOneRefresh<T>(operation: (token: string) => Promise<FederatoTransportResult<T>>): Promise<T> {
    let token = await this.tokens.getToken();
    let result = await operation(token.value);
    if (result.status === 401) { token = await this.tokens.getToken({ forceRefresh: true }); result = await operation(token.value); }
    if (result.status < 200 || result.status >= 300 || result.data === undefined) throw new FederatoClientError(result.message ?? `Federato request failed with status ${result.status}`, result.status);
    return result.data;
  }
}
