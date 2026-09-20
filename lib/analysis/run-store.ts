import { randomUUID } from "node:crypto";
import { getAppetiteRules } from "../appetite/rules";
import { analyzeSubmissions } from "./analyze";
import { normalizedDemoSubmissions } from "./demo-inputs";
import type { AnalysisRun } from "./types";

const runs = new Map<string, AnalysisRun>();

export function startCachedAnalysis(): AnalysisRun {
  const id = `run-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const queued: AnalysisRun = { id, status: "queued", source: "cached", appetiteVersion: getAppetiteRules()[0].version, createdAt, completedAt: null, processed: 0, total: normalizedDemoSubmissions.length, packets: [], error: null };
  runs.set(id, queued);
  const analyzing = { ...queued, status: "analyzing" as const };
  runs.set(id, analyzing);
  try {
    const packets = analyzeSubmissions(normalizedDemoSubmissions);
    const complete: AnalysisRun = { ...analyzing, status: "complete", processed: packets.length, packets, completedAt: new Date().toISOString() };
    runs.set(id, complete);
    return complete;
  } catch (error) {
    const failed: AnalysisRun = { ...analyzing, status: "recoverable_error", error: error instanceof Error ? error.message : "Cached analysis failed", completedAt: new Date().toISOString() };
    runs.set(id, failed);
    return failed;
  }
}

export function getAnalysisRun(id: string): AnalysisRun | undefined { return runs.get(id); }
export function clearAnalysisRuns(): void { runs.clear(); }
