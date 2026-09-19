import type { DecisionPacket } from "../contracts";
import { rankDecisionPackets } from "../appetite/ranking";
import { demoDecisionPackets } from "../../fixtures/demo/decision-packets";

const packetsById = new Map(demoDecisionPackets.map((packet) => [packet.submission.id, packet]));

export function getDemoDecisionPackets(): DecisionPacket[] {
  return rankDecisionPackets(demoDecisionPackets);
}

export function getDemoDecisionPacket(id: string): DecisionPacket | undefined {
  return packetsById.get(id);
}
