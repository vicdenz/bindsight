import { diffDecisionPackets, diffRules } from "../appetite/diff";
import { APPETITE_VERSION, CA_ACCEPTABLE_VERSION, getAppetiteRules } from "../appetite/rules";
import { analyzeSubmissions } from "./analyze";
import { normalizedDemoSubmissions } from "./demo-inputs";

export function californiaTargetToAcceptableDiff() {
  const oldRules = getAppetiteRules(APPETITE_VERSION);
  const newRules = getAppetiteRules(CA_ACCEPTABLE_VERSION);
  const oldPackets = analyzeSubmissions(normalizedDemoSubmissions, oldRules);
  const newPackets = analyzeSubmissions(normalizedDemoSubmissions, newRules);
  return {
    oldVersion: APPETITE_VERSION,
    newVersion: CA_ACCEPTABLE_VERSION,
    sourceText: "Move California from target to acceptable-only.",
    ruleChanges: diffRules(oldRules, newRules),
    affectedPackets: diffDecisionPackets(oldPackets, newPackets),
    oldPackets,
    newPackets,
  };
}
