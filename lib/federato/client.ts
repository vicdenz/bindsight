import type { FederatoTokenProvider } from "./auth";
import type { FederatoQueryRequest } from "./query-lowerer";
import type { FederatoSchema } from "./schema";

export type FederatoTransportResult<T> = { status: number; data?: T; message?: string };

export interface FederatoTransport {
  discoverSchema(token: string): Promise<FederatoTransportResult<FederatoSchema>>;
  query<T>(token: string, request: FederatoQueryRequest): Promise<FederatoTransportResult<T>>;
}

export interface FederatoFallback {
  schema?(): Promise<FederatoSchema | undefined>;
  query?(request: FederatoQueryRequest): Promise<unknown | undefined>;
}

export class FederatoClientError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "FederatoClientError";
  }
}

export class FederatoClient {
  constructor(
    private readonly tokens: FederatoTokenProvider,
    private readonly transport: FederatoTransport,
    private readonly fallback?: FederatoFallback,
  ) {}

  async discoverSchema(): Promise<FederatoSchema> {
    try {
      return await this.withOneRefresh((token) => this.transport.discoverSchema(token));
    } catch (error) {
      const cached = await this.fallback?.schema?.();
      if (cached) return cached;
      throw error;
    }
  }

  async query<T>(request: FederatoQueryRequest): Promise<T> {
    try {
      return await this.withOneRefresh((token) => this.transport.query<T>(token, request));
    } catch (error) {
      const cached = await this.fallback?.query?.(request);
      if (cached !== undefined) return cached as T;
      throw error;
    }
  }

  private async withOneRefresh<T>(operation: (token: string) => Promise<FederatoTransportResult<T>>): Promise<T> {
    let token = await this.tokens.getToken();
    let result = await operation(token.value);
    if (result.status === 401) {
      token = await this.tokens.getToken({ forceRefresh: true });
      result = await operation(token.value);
    }
    if (result.status < 200 || result.status >= 300 || result.data === undefined) {
      throw new FederatoClientError(result.message ?? `Federato request failed with status ${result.status}`, result.status);
    }
    return result.data;
  }
}
