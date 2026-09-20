import "server-only";

import type { ActionTier, DecisionPacket, ScreeningStatus } from "../contracts";
import { createFederatoClient } from "../federato/runtime";
import { normalizeQueryPage } from "../federato/client";
import type { FederatoQueryRequest } from "../federato/query-lowerer";
import { getDemoDecisionPackets } from "../cache/demo-snapshot";
import { analyzeSubmissions } from "./analyze";
import { normalizeFederatoPolicy } from "./federato-normalizer";

const livePolicyQuery: FederatoQueryRequest = {
  resource: "Policy",
  expand: {
    insured: { hq: true },
    submission: true,
    claims: true,
    exposure_units: { location: { buildings: true } },
  },
  select: {
    id: true,
    premium: true,
    business_type: true,
    line_of_business: true,
    insured: { id: true, name: true, hq: { id: true, state: true } },
    submission: { id: true, status: true, received_date: true, submission_number: true },
    claims: { id: true, date_of_loss: true, paid_expense: true, paid_indemnity: true, reserve_expense: true, reserve_indemnity: true },
    exposure_units: {
      kind: true,
      basis_amount: true,
      location: { id: true, state: true, buildings: { id: true, tiv: true, year_built: true, construction_type: true } },
    },
  },
  pagination: { limit: 100, offset: 0 },
};

const PAGE_SIZE = 100;
const MAX_PAGES = 100;
const LIVE_CACHE_TTL_MS = 30_000;

let cachedLiveData: { data: DecisionData; expiresAt: number } | undefined;
let pendingLiveData: Promise<DecisionData> | undefined;

async function fetchLivePolicies(): Promise<unknown[]> {
  const client = createFederatoClient();
  const records: unknown[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let pages = 0;
  while (offset < total) {
    if (pages >= MAX_PAGES) throw new Error(`Federato pagination exceeded ${MAX_PAGES} pages.`);
    const response = await client.query<unknown>({ ...livePolicyQuery, pagination: { limit: PAGE_SIZE, offset } });
    const page = normalizeQueryPage<unknown>(response);
    pages += 1;
    total = page.total;
    records.push(...page.records);
    if (page.records.length === 0) break;
    offset += page.records.length;
  }
  if (records.length < total) throw new Error(`Federato returned ${records.length} of ${total} records.`);
  return records;
}

export type DecisionData = {
  schemaVersion: "1.0";
  generatedAt: string;
  packets: DecisionPacket[];
  source: "live" | "cached";
  summary: {
    total: number;
    cohorts: Record<ScreeningStatus, number>;
    tiers: Partial<Record<ActionTier, number>>;
    assessmentMode: "retrospective" | "demo" | "intake";
  };
  profiles: Array<{
    id: string;
    label: string;
    version: string;
    authority: "supplied_challenge_document";
    sourceHref: string;
  }>;
  warning?: string;
};

function decisionData(packets: DecisionPacket[], source: "live" | "cached", generatedAt: string, warning?: string): DecisionData {
  const cohorts: Record<ScreeningStatus, number> = { evaluated: 0, renewal: 0, unsupported_line: 0 };
  const tiers: Partial<Record<ActionTier, number>> = {};
  for (const packet of packets) {
    cohorts[packet.screening.status] += 1;
    tiers[packet.tier] = (tiers[packet.tier] ?? 0) + 1;
  }
  const modes = new Set(packets.map((packet) => packet.analysis.mode));
  const assessmentMode = modes.has("intake") ? "intake" : modes.has("retrospective") ? "retrospective" : "demo";
  return {
    schemaVersion: "1.0",
    generatedAt,
    packets,
    source,
    summary: { total: packets.length, cohorts, tiers, assessmentMode },
    profiles: [{
      id: "commercial-property-2025.1",
      label: "2025 Commercial Property — New Business",
      version: "2025.1",
      authority: "supplied_challenge_document",
      sourceHref: "/appetite#current-profile-heading",
    }],
    ...(warning ? { warning } : {}),
  };
}

async function loadLiveData(): Promise<DecisionData> {
  const startedAt = Date.now();
  const retrievedAt = new Date().toISOString();
  const policies = await fetchLivePolicies();
  const normalizedBySubmission = new Map<string, ReturnType<typeof normalizeFederatoPolicy>>();
  let rejected = 0;
  for (const policy of policies) {
    try {
      const normalized = normalizeFederatoPolicy(policy);
      normalizedBySubmission.set(normalized.id, normalized);
    }
    catch { rejected += 1; }
  }
  const normalized = [...normalizedBySubmission.values()];
  if (normalized.length === 0) throw new Error("Federato returned no valid policy records.");
  const packets = analyzeSubmissions(normalized, undefined, { source: "live", retrievedAt })
    .map((packet) => ({ ...packet, analysis: { ...packet.analysis, latencyMs: Date.now() - startedAt } }));
  return decisionData(
    packets,
    "live",
    retrievedAt,
    rejected > 0 ? `${rejected} malformed Federato record${rejected === 1 ? " was" : "s were"} skipped.` : undefined,
  );
}

export async function getDecisionData(): Promise<DecisionData> {
  const now = Date.now();
  if (cachedLiveData && cachedLiveData.expiresAt > now) return cachedLiveData.data;
  if (!pendingLiveData) pendingLiveData = loadLiveData();
  try {
    const data = await pendingLiveData;
    cachedLiveData = { data, expiresAt: Date.now() + LIVE_CACHE_TTL_MS };
    return data;
  } catch (error) {
    if (cachedLiveData) {
      return { ...cachedLiveData.data, warning: `Federato refresh failed; showing the last successful live snapshot. ${error instanceof Error ? error.message : "Unknown error."}` };
    }
    return {
      ...decisionData(getDemoDecisionPackets(), "cached", new Date().toISOString()),
      warning: error instanceof Error ? error.message : "Federato data is unavailable.",
    };
  } finally {
    pendingLiveData = undefined;
  }
}

export async function getDecisionPacket(id: string): Promise<{ packet?: DecisionPacket; source: "live" | "cached"; warning?: string }> {
  const data = await getDecisionData();
  return { packet: data.packets.find((packet) => packet.submission.id === id), source: data.source, warning: data.warning };
}
