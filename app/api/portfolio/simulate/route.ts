import { NextResponse } from "next/server";
import { analyzeSubmissions } from "../../../../lib/analysis/analyze";
import { normalizedDemoSubmissions } from "../../../../lib/analysis/demo-inputs";
import { simulateStateConcentration } from "../../../../lib/analysis/portfolio";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { submissionId?: unknown } | null;
  if (!body || typeof body.submissionId !== "string" || !body.submissionId) return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
  const result = simulateStateConcentration(analyzeSubmissions(normalizedDemoSubmissions), body.submissionId);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Submission or primary state not found" }, { status: 404 });
}
