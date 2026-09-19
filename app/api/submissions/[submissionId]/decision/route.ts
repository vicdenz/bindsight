import { NextResponse } from "next/server";

import { getCachedDecisionPacket } from "../../../../../lib/cache/analysis";

type RouteContext = { params: Promise<{ submissionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { submissionId } = await context.params;
  const packet = getCachedDecisionPacket(submissionId);
  if (!packet) {
    return NextResponse.json(
      { error: "Decision packet not found", submissionId, source: "cached" },
      { status: 404 },
    );
  }
  return NextResponse.json(packet);
}
