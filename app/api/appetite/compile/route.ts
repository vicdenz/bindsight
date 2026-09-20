import { NextResponse } from "next/server";
import { APPETITE_VERSION, CA_ACCEPTABLE_VERSION, getAppetiteRules } from "../../../../lib/appetite/rules";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { californiaTarget?: boolean };
  const version = body.californiaTarget === false ? CA_ACCEPTABLE_VERSION : APPETITE_VERSION;
  return NextResponse.json({ version, rules: getAppetiteRules(version), ambiguities: ["Exactly 1990 building year", "Exactly 50% supported construction", "Exactly $100,000 five-year losses"], source: "deterministic_fallback" });
}
