import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoDecisionPackets } from "@/lib/cache/demo-snapshot";
import { OpenAIResponsesReviewerProvider, UnavailableReviewerProvider } from "@/lib/openai/client";
import { BudgetLedger } from "@/lib/openai/budget";
import { runReviewer } from "@/lib/openai/reviewer";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ question: z.string().trim().min(1).max(2_000) }).strict();
const eventLedger = new BudgetLedger();

function configuredNumber(name: string): number {
  const parsed = Number(process.env[name] ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid reviewer question is required." }, { status: 400 });
  }
  const provider = process.env.OPENAI_API_KEY
    ? new OpenAIResponsesReviewerProvider({
        apiKey: process.env.OPENAI_API_KEY,
        inputCostPerMillionUsd: configuredNumber("OPENAI_INPUT_COST_PER_MILLION_USD"),
        outputCostPerMillionUsd: configuredNumber("OPENAI_OUTPUT_COST_PER_MILLION_USD"),
      })
    : new UnavailableReviewerProvider();
  const response = await runReviewer(parsed.data.question, {
    provider,
    packets: getDemoDecisionPackets(),
    ledger: eventLedger,
    models: {
      fast: process.env.OPENAI_FAST_MODEL ?? "gpt-5.6-luna",
      review: process.env.OPENAI_REVIEW_MODEL ?? "gpt-5.6-terra",
      deep: process.env.OPENAI_DEEP_MODEL ?? "gpt-6-astra",
    },
  });
  return NextResponse.json(response);
}
