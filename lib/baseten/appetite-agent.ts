import { z } from "zod";
import { appetiteRuleSchema, type AppetiteRule } from "../contracts/decision";
import { BasetenClient, type BasetenMessage } from "./client";

const compiledAppetiteSchema = z.object({ rules: z.array(appetiteRuleSchema).min(1), ambiguities: z.array(z.string()) });
export type CompiledAppetite = z.infer<typeof compiledAppetiteSchema> & { repaired: boolean; provider: "baseten" | "fallback" };

function parseJson(content: string): unknown {
  try { return JSON.parse(content); } catch { return undefined; }
}

export async function compileAppetite(input: {
  client: BasetenClient; model: string; appetiteText: string; glossary?: string; fallbackRules?: AppetiteRule[];
}): Promise<CompiledAppetite> {
  const messages: BasetenMessage[] = [
    { role: "system" as const, content: "Compile underwriting appetite into strict JSON with keys rules and ambiguities. Preserve exact boundaries and explicitly report ambiguity. Never resolve undefined equality boundaries." },
    { role: "user" as const, content: JSON.stringify({ appetite: input.appetiteText, glossary: input.glossary ?? "" }) },
  ];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await input.client.complete({ model: input.model, messages, temperature: 0, responseFormat: { type: "json_object" } }, { cache: attempt === 0 });
    const parsed = compiledAppetiteSchema.safeParse(parseJson(result.content));
    if (parsed.success) return { ...parsed.data, repaired: attempt === 1, provider: "baseten" };
    messages.push({ role: "assistant", content: result.content });
    messages.push({ role: "user", content: `Repair the JSON using these validation errors only: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}` });
  }
  if (input.fallbackRules) return { rules: input.fallbackRules.map((rule) => appetiteRuleSchema.parse(rule)), ambiguities: ["Baseten compilation unavailable; using validated fallback rules."], repaired: true, provider: "fallback" };
  throw new Error("Baseten appetite compilation failed validation after one repair");
}
