import { NextResponse } from "next/server";

import { getProviderConfiguration } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export function GET() {
  const providers = getProviderConfiguration();

  return NextResponse.json({
    status: Object.values(providers).every(({ configured }) => configured) ? "ready" : "degraded",
    providers,
    note: "Configuration only; no paid or external provider calls were made.",
  });
}
