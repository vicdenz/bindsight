import { NextResponse } from "next/server";

import { getDecisionPacket } from "../../../../../lib/analysis/live";

type RouteContext = { params: Promise<{ submissionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { submissionId } = await context.params;
  const { packet, source, warning } = await getDecisionPacket(submissionId);
  if (!packet) {
    return NextResponse.json(
      { error: "Decision packet not found", submissionId, source, ...(warning ? { warning } : {}) },
      { status: 404 },
    );
  }
  return NextResponse.json(packet, { headers: {
    "Cache-Control": "private, no-store",
    "X-BindSight-Data-Source": source,
    "X-BindSight-Assessment-Mode": packet.analysis.mode,
  } });
}
