import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoDecisionPackets } from "@/lib/cache/demo-snapshot";
import { UnavailableReviewerProvider } from "@/lib/openai/client";
import { runReviewer } from "@/lib/openai/reviewer";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ question: z.string().trim().min(1).max(2_000) }).strict();

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid reviewer question is required." }, { status: 400 });
  }
  const response = await runReviewer(parsed.data.question, {
    provider: new UnavailableReviewerProvider(),
    packets: getDemoDecisionPackets(),
  });
  return NextResponse.json(response);
}
