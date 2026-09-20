import type { NormalizedSubmission } from "./types";

const common = { submissionType: "New Business", lineOfBusiness: "Property", supportedConstructionPercentage: 75, fiveYearLossValue: 20_000, receivedAt: "2026-09-18T12:00:00.000Z" };

export const normalizedDemoSubmissions: readonly NormalizedSubmission[] = [
  { ...common, id: "full-review-now", accountName: "Pacific Robotics", primaryState: "CA", totalInsuredValue: 75_000_000, premium: 85_000, buildingYear: 2018 },
  { ...common, id: "full-standard", accountName: "Blue Ridge Textiles", primaryState: "NC", totalInsuredValue: 40_000_000, premium: 60_000, buildingYear: 2005 },
  { ...common, id: "full-request-info", accountName: "Capital Food Works", primaryState: "MD", totalInsuredValue: 68_000_000, premium: 90_000, buildingYear: null },
  { ...common, id: "full-manual", accountName: "Keystone Components", primaryState: "PA", totalInsuredValue: 81_000_000, premium: 82_000, buildingYear: 1990 },
  { ...common, id: "full-likely-decline", accountName: "Empire Distribution", primaryState: "NY", totalInsuredValue: 160_000_000, premium: 45_000, buildingYear: 1985 },
];
