export const FEDERATO_AUDIENCE = "https://product.federato.ai/core-api";
export type FederatoCredentials = { clientId: string; clientSecret: string; authUrl: string; handlerUrl: string };
export type FederatoAccessToken = { value: string; expiresAt: number };
export interface FederatoTokenProvider { getToken(options?: { forceRefresh?: boolean }): Promise<FederatoAccessToken> }
export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
export const FEDERATO_REQUEST_TIMEOUT_MS = 10_000;
function required(env: NodeJS.ProcessEnv, name: string): string { const value = env[name]; if (!value) throw new Error(`Missing server environment variable: ${name}`); return value; }
export function readFederatoCredentials(env: NodeJS.ProcessEnv = process.env): FederatoCredentials {
  if (typeof window !== "undefined") throw new Error("Federato credentials are server-only");
  return { clientId: required(env, "FEDERATO_CLIENT_ID"), clientSecret: required(env, "FEDERATO_CLIENT_SECRET"), authUrl: required(env, "FEDERATO_AUTH_URL"), handlerUrl: required(env, "FEDERATO_HANDLER_URL") };
}
export class Auth0FederatoTokenProvider implements FederatoTokenProvider {
  private cached?: FederatoAccessToken;
  constructor(private readonly credentials: FederatoCredentials, private readonly fetcher: FetchLike = fetch) {}
  async getToken(options: { forceRefresh?: boolean } = {}): Promise<FederatoAccessToken> {
    if (!options.forceRefresh && this.cached && this.cached.expiresAt - Date.now() > 30_000) return this.cached;
    const response = await this.fetcher(this.credentials.authUrl, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(FEDERATO_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({ client_id: this.credentials.clientId, client_secret: this.credentials.clientSecret, audience: FEDERATO_AUDIENCE, grant_type: "client_credentials" }) });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw new Error(`Federato authentication failed with status ${response.status}`);
    if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).access_token !== "string" || typeof (body as Record<string, unknown>).expires_in !== "number") throw new Error("Federato authentication returned an invalid response");
    this.cached = { value: (body as { access_token: string }).access_token, expiresAt: Date.now() + (body as { expires_in: number }).expires_in * 1000 };
    return this.cached;
  }
}
