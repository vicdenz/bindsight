import type { DecisionPacket } from "../contracts";

export type NormalizedSubmission = {
  id: string;
  accountName: string;
  submissionType: string | null;
  lineOfBusiness: string | null;
  primaryState: string | null;
  totalInsuredValue: number | null;
  premium: number | null;
  buildingYear: number | null;
  supportedConstructionPercentage: number | null;
  fiveYearLossValue: number | null;
  receivedAt: string;
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
