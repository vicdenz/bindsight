import { NextResponse } from "next/server";
import { getAnalysisRun } from "../../../../lib/analysis/run-store";

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params;
  const run = getAnalysisRun(runId);
  return run
    ? NextResponse.json(run)
    : NextResponse.json({ error: "Analysis run not found", runId }, { status: 404 });
}
