import type { DecisionPacket } from "../contracts";

export type NormalizedSubmission = {
  id: string;
  accountName: string;
  sourceStatus?: string | null;
  submissionType: string | null;
  lineOfBusiness: string | null;
  primaryState: string | null;
  totalInsuredValue: number | null;
  premium: number | null;
  buildingYear: number | null;
  supportedConstructionPercentage: number | null;
  fiveYearLossValue: number | null;
  receivedAt: string;
  fieldEvidence?: Partial<Record<NormalizedField, NormalizedFieldEvidence>>;
};

export type NormalizedField = Exclude<keyof NormalizedSubmission, "id" | "accountName" | "sourceStatus" | "receivedAt" | "fieldEvidence">;

export type NormalizedFieldEvidence = {
  resource: string;
  recordId: string;
  fieldPath: string;
  rawValue: unknown;
  provenance: "federato" | "derived";
  calculation?: { operation: "sum" | "ratio" | "min"; unit: string };
};

export type AnalysisRun = {
  id: string;
  status: "queued" | "analyzing" | "complete" | "recoverable_error";
  source: "cached";
  appetiteVersion: string;
  createdAt: string;
  completedAt: string | null;
  processed: number;
  total: number;
  packets: DecisionPacket[];
  error: string | null;
};
