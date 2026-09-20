import type { AppetiteRule, DecisionPacket, ReviewerResponse } from "../contracts";

export interface CitationValidationResult {
  valid: boolean;
  errors: string[];
  knownIds: Set<string>;
}

export function collectKnownCitationIds(
  packets: readonly DecisionPacket[],
  rules: readonly AppetiteRule[] = [],
): Set<string> {
  const ids = new Set<string>();
  for (const packet of packets) {
    ids.add(packet.submission.id);
    for (const atom of packet.atoms) {
      ids.add(atom.id);
      ids.add(atom.ruleId);
    }
    for (const evidence of packet.evidence) ids.add(evidence.id);
    for (const calculation of packet.calculations) ids.add(calculation.id);
  }
  for (const rule of rules) ids.add(rule.id);
  return ids;
}

export function validateReviewerCitations(
  response: Pick<ReviewerResponse, "citedIds" | "insufficientEvidence">,
  packets: readonly DecisionPacket[],
  rules: readonly AppetiteRule[] = [],
): CitationValidationResult {
  const knownIds = collectKnownCitationIds(packets, rules);
  const errors: string[] = [];
  for (const citation of response.citedIds) {
    if (!knownIds.has(citation)) errors.push(`Unknown citation ID: ${citation}`);
  }

  if (!response.insufficientEvidence && response.citedIds.length === 0) {
    errors.push("A substantive reviewer answer must cite at least one known ID.");
  }

  return { valid: errors.length === 0, errors, knownIds };
}
