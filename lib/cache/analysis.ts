import type { DecisionPacket } from "../contracts";
import { getDemoDecisionPacket, getDemoDecisionPackets } from "./demo-snapshot";

export type CachedAnalysisResult = {
  runId: string;
  source: "cached";
  analyzedAt: string;
  packets: DecisionPacket[];
};

export function analyzeCachedSubmissions(): CachedAnalysisResult {
  return {
    runId: "demo-cached-v1",
    source: "cached",
    analyzedAt: new Date().toISOString(),
    packets: getDemoDecisionPackets(),
  };
}

export function getCachedDecisionPacket(submissionId: string): DecisionPacket | null {
  return getDemoDecisionPacket(submissionId) ?? null;
}
