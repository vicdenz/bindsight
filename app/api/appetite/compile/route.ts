import { NextResponse } from "next/server";
import { APPETITE_VERSION, CA_ACCEPTABLE_VERSION, getAppetiteRules } from "../../../../lib/appetite/rules";
import { compileAppetite } from "../../../../lib/baseten/appetite-agent";
import { BasetenClient, BasetenOpenAITransport } from "../../../../lib/baseten/client";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { californiaTarget?: boolean; appetiteText?: string; glossary?: string };
  const version = body.californiaTarget === false ? CA_ACCEPTABLE_VERSION : APPETITE_VERSION;
  const fallbackRules = getAppetiteRules(version);
  const apiKey = process.env.BASETEN_API_KEY;
  const baseUrl = process.env.BASETEN_OPENAI_BASE_URL;
  const model = process.env.BASETEN_COMPILER_MODEL;
  if (apiKey && baseUrl && model && body.appetiteText) {
    try {
      const compiled = await compileAppetite({
        client: new BasetenClient(new BasetenOpenAITransport({ apiKey, baseUrl })),
        model,
        appetiteText: body.appetiteText,
        glossary: body.glossary,
        fallbackRules,
      });
      return NextResponse.json({ version, ...compiled, source: compiled.provider });
    } catch {
      // Preserve the deterministic workbench when provider inference is unavailable.
    }
  }
  return NextResponse.json({ version, rules: fallbackRules, ambiguities: ["Exactly 1990 building year", "Exactly 50% supported construction", "Exactly $100,000 five-year losses"], source: "deterministic_fallback" });
}
