import type { DecisionPacket } from "../contracts";

export function simulateStateConcentration(packets: readonly DecisionPacket[], submissionId: string) {
  const candidate = packets.find((packet) => packet.submission.id === submissionId);
  if (!candidate?.submission.primaryState) return null;
  const eligible = packets.filter((packet) => packet.tier !== "likely_decline" && packet.submission.totalInsuredValue !== null);
  const state = candidate.submission.primaryState;
  const existing = eligible.filter((packet) => packet.submission.id !== submissionId);
  const totalBefore = existing.reduce((sum, packet) => sum + (packet.submission.totalInsuredValue ?? 0), 0);
  const stateBefore = existing.filter((packet) => packet.submission.primaryState === state).reduce((sum, packet) => sum + (packet.submission.totalInsuredValue ?? 0), 0);
  const candidateTiv = candidate.submission.totalInsuredValue ?? 0;
  const before = totalBefore === 0 ? 0 : stateBefore / totalBefore;
  const after = totalBefore + candidateTiv === 0 ? 0 : (stateBefore + candidateTiv) / (totalBefore + candidateTiv);
  return { submissionId, dimension: `primaryState:${state}`, before, after, delta: after - before, unit: "share_of_tiv", note: "Concentration preview only; not catastrophe modeling." };
}
