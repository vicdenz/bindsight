import type { AppetiteRule, DecisionPacket } from "../contracts";

export type RuleChange = { ruleId: string; concept: string; before: AppetiteRule; after: AppetiteRule };
export type PacketChange = { submissionId: string; accountName: string; oldTier: DecisionPacket["tier"]; newTier: DecisionPacket["tier"]; changedAtoms: string[] };

export function diffRules(before: readonly AppetiteRule[], after: readonly AppetiteRule[]): RuleChange[] {
  const oldById = new Map(before.map((rule) => [rule.id, rule]));
  return after.flatMap((rule) => {
    const previous = oldById.get(rule.id);
    const withoutVersion = (item: AppetiteRule) => ({ ...item, version: undefined });
    return previous && JSON.stringify(withoutVersion(previous)) !== JSON.stringify(withoutVersion(rule))
      ? [{ ruleId: rule.id, concept: rule.concept, before: previous, after: rule }]
      : [];
  });
}

export function diffDecisionPackets(before: readonly DecisionPacket[], after: readonly DecisionPacket[]): PacketChange[] {
  const oldById = new Map(before.map((packet) => [packet.submission.id, packet]));
  return after.flatMap((packet) => {
    const previous = oldById.get(packet.submission.id);
    if (!previous) return [];
    const oldAtoms = new Map(previous.atoms.map((atom) => [atom.ruleId, atom.status]));
    const changedAtoms = packet.atoms.filter((atom) => oldAtoms.get(atom.ruleId) !== atom.status).map((atom) => atom.ruleId);
    return changedAtoms.length || previous.tier !== packet.tier
      ? [{ submissionId: packet.submission.id, accountName: packet.submission.accountName, oldTier: previous.tier, newTier: packet.tier, changedAtoms }]
      : [];
  });
}
