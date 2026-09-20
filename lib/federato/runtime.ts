import "server-only";

import { Auth0FederatoTokenProvider, readFederatoCredentials } from "./auth";
import { FederatoClient, HttpFederatoTransport } from "./client";

export function createFederatoClient(env: NodeJS.ProcessEnv = process.env): FederatoClient {
  const credentials = readFederatoCredentials(env);
  return new FederatoClient(
    new Auth0FederatoTokenProvider(credentials),
    new HttpFederatoTransport(credentials.handlerUrl),
  );
}
