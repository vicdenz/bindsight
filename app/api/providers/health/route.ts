import { NextResponse } from "next/server";

import { getProviderConfiguration, readServerEnvironment } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export function GET() {
  const providers = getProviderConfiguration();
  const selectedAiProvider = readServerEnvironment().AI_PROVIDER;

  return NextResponse.json({
    status: providers.federato.configured
      && providers.openai.configured
      && (selectedAiProvider !== "baseten" || providers.baseten.configured)
      ? "ready"
      : "degraded",
    selectedAiProvider,
    providers,
    note: "Configuration only; no paid or external provider calls were made.",
  });
}
