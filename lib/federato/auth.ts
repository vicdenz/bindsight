export type FederatoCredentials = {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  handlerUrl: string;
};

export type FederatoAccessToken = {
  value: string;
  expiresAt: number;
};

export interface FederatoTokenProvider {
  getToken(options?: { forceRefresh?: boolean }): Promise<FederatoAccessToken>;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

/** Call only from a server route or server module; credentials are never serialized. */
export function readFederatoCredentials(env: NodeJS.ProcessEnv = process.env): FederatoCredentials {
  if (typeof window !== "undefined") throw new Error("Federato credentials are server-only");
  return {
    clientId: required(env, "FEDERATO_CLIENT_ID"),
    clientSecret: required(env, "FEDERATO_CLIENT_SECRET"),
    authUrl: required(env, "FEDERATO_AUTH_URL"),
    handlerUrl: required(env, "FEDERATO_HANDLER_URL"),
  };
}
