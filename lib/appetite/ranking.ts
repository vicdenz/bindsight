import type { ActionTier, DecisionPacket } from "../contracts";

const TIER_ORDER: Record<ActionTier, number> = {
  review_now: 0,
  standard_review: 1,
  request_information: 2,
  manual_review: 3,
  likely_decline: 4,
  screened_out: 5,
  not_evaluated: 6,
};

export function compareDecisionPackets(left: DecisionPacket, right: DecisionPacket): number {
  return TIER_ORDER[left.tier] - TIER_ORDER[right.tier]
    || right.score.targetAlignment - left.score.targetAlignment
    || right.score.evidenceCompleteness - left.score.evidenceCompleteness
    || right.score.portfolioContribution - left.score.portfolioContribution
    || right.score.premiumOpportunity - left.score.premiumOpportunity
    || (right.submission.premium ?? -1) - (left.submission.premium ?? -1)
    || Date.parse(left.submission.receivedAt) - Date.parse(right.submission.receivedAt)
    || left.submission.id.localeCompare(right.submission.id);
}

export function rankDecisionPackets(packets: readonly DecisionPacket[]): DecisionPacket[] {
  return packets.map((packet, index) => ({ packet, index }))
    .sort((left, right) => compareDecisionPackets(left.packet, right.packet) || left.index - right.index)
    .map(({ packet }) => packet);
}
