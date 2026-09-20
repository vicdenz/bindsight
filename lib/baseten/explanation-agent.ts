import { z } from "zod";
import { actionTierSchema, type DecisionPacket } from "../contracts/decision";
import { BasetenClient, mapConcurrent, type BasetenMessage } from "./client";

const generatedExplanationSchema = z.object({ text: z.string().min(1), citations: z.array(z.string()).min(1), tier: actionTierSchema });
export type ExplanationResult = z.infer<typeof generatedExplanationSchema> & { provider: "baseten" | "fallback"; validationErrors: string[] };

function validIds(packet: DecisionPacket): Set<string> {
  return new Set([...packet.evidence.map((item) => item.id), ...packet.calculations.map((item) => item.id), ...packet.atoms.map((item) => item.id), ...packet.atoms.map((item) => item.ruleId)]);
}
function numericValues(packet: DecisionPacket): number[] {
  const values = [packet.submission.premium, packet.submission.totalInsuredValue, ...packet.calculations.map((item) => item.result),
    ...packet.evidence.map((item) => typeof item.normalizedValue === "number" ? item.normalizedValue : null)];
  return values.filter((value): value is number => value !== null && Number.isFinite(value));
}
export function validateExplanation(value: unknown, packet: DecisionPacket): { success: true; data: z.infer<typeof generatedExplanationSchema> } | { success: false; errors: string[] } {
  const parsed = generatedExplanationSchema.safeParse(value);
  if (!parsed.success) return { success: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  const errors: string[] = [];
  const ids = validIds(packet);
  for (const citation of parsed.data.citations) {
    if (!ids.has(citation)) errors.push(`Unknown citation: ${citation}`);
    if (!parsed.data.text.includes(`[${citation}]`)) errors.push(`Citation is not present in text: ${citation}`);
  }
  if (parsed.data.tier !== packet.tier) errors.push(`Tier ${parsed.data.tier} contradicts deterministic tier ${packet.tier}`);
  const allowedNumbers = numericValues(packet);
  const proseWithoutCitations = parsed.data.text.replaceAll(/\[[^\]]+\]/g, "");
  const mentioned = [...proseWithoutCitations.matchAll(/(?<![A-Za-z0-9])\$?([0-9][0-9,]*(?:\.[0-9]+)?)(?:[KMB])?/gi)];
  for (const match of mentioned) {
    let number = Number(match[1].replaceAll(",", ""));
    const suffix = match[0].at(-1)?.toUpperCase();
    if (suffix === "K") number *= 1_000;
    if (suffix === "M") number *= 1_000_000;
    if (suffix === "B") number *= 1_000_000_000;
    if (!allowedNumbers.some((allowed) => Math.abs(allowed - number) < 0.000001)) errors.push(`Unsupported numeric value: ${match[0]}`);
  }
  const lower = parsed.data.text.toLowerCase();
  if (packet.atoms.some((atom) => atom.status === "missing") && /missing[^.]{0,30}(fail|declin|unacceptable)/.test(lower)) errors.push("Missing evidence is described as failure");
  const hardFailures = packet.atoms.filter((atom) => atom.hardGate && atom.status === "fail");
  if (hardFailures.some((atom) => !parsed.data.citations.includes(atom.id) && !parsed.data.citations.includes(atom.ruleId))) errors.push("A hard failure is concealed");
  if (/target\s+(?:is|means)\s+acceptable|acceptable\s+(?:is|means)\s+target/.test(lower)) errors.push("Target and acceptable are conflated");
  if (packet.portfolioDelta && /carrier (?:rule|policy|requirement)/.test(lower)) errors.push("A portfolio assumption is described as carrier policy");
  if (/external[^.]{0,50}federato data|federato data[^.]{0,50}external/.test(lower)) errors.push("An external signal is described as Federato data");
  return errors.length ? { success: false, errors } : { success: true, data: parsed.data };
}

function fallback(packet: DecisionPacket, errors: string[]): ExplanationResult {
  const decisive = packet.atoms.find((atom) => atom.hardGate && atom.status === "fail")
    ?? packet.atoms.find((atom) => atom.status === "conflict" || atom.status === "missing") ?? packet.atoms[0];
  const citation = decisive?.id ?? packet.evidence[0]?.id;
  const text = citation ? `Deterministic analysis assigns ${packet.tier.replaceAll("_", " ")} based on the validated decision record [${citation}].` : `Deterministic analysis assigns ${packet.tier.replaceAll("_", " ")}; no supporting citation is available.`;
  return { text, citations: citation ? [citation] : [], tier: packet.tier, provider: "fallback", validationErrors: errors };
}

export async function explainPacket(input: { client: BasetenClient; model: string; packet: DecisionPacket }): Promise<ExplanationResult> {
  const messages: BasetenMessage[] = [
    { role: "system" as const, content: "Return JSON {text,citations,tier}. Write 2-3 concise sentences. Every fact and number must cite an existing ID in square brackets. Never change the deterministic tier or call missing evidence a failure." },
    { role: "user" as const, content: JSON.stringify(input.packet) },
  ];
  let errors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await input.client.complete({ model: input.model, messages, temperature: 0, responseFormat: { type: "json_object" } }, { cache: attempt === 0 });
    let value: unknown;
    try { value = JSON.parse(result.content); } catch { value = undefined; }
    const validation = validateExplanation(value, input.packet);
    if (validation.success) return { ...validation.data, provider: "baseten", validationErrors: [] };
    errors = validation.errors;
    messages.push({ role: "assistant", content: result.content });
    messages.push({ role: "user", content: `Repair using these validation errors: ${errors.join("; ")}` });
  }
  return fallback(input.packet, errors);
}

export function explainPackets(input: { client: BasetenClient; model: string; packets: readonly DecisionPacket[]; concurrency?: number }): Promise<ExplanationResult[]> {
  return mapConcurrent(input.packets, input.concurrency ?? 4, (packet) => explainPacket({ client: input.client, model: input.model, packet }));
}
