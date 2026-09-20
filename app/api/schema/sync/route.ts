import { NextResponse } from "next/server";

import { createFederatoClient } from "@/lib/federato/runtime";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const schema = await createFederatoClient().discoverSchema();
    return NextResponse.json({ source: "federato", syncedAt: new Date().toISOString(), schema });
  } catch (error) {
    return NextResponse.json({
      source: "unavailable",
      error: error instanceof Error ? error.message : "Federato schema sync failed.",
    }, { status: 503 });
  }
}
