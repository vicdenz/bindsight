import { z } from "zod";

import type { NormalizedSubmission } from "./types";

const buildingSchema = z.object({
  id: z.union([z.string(), z.number()]),
  tiv: z.number().nonnegative(),
  year_built: z.number().int().nullable().optional(),
  construction_type: z.string().nullable().optional(),
});

const locationSchema = z.object({
  id: z.union([z.string(), z.number()]),
  state: z.string().nullable().optional(),
  buildings: z.array(buildingSchema).default([]),
});

const exposureSchema = z.object({
  kind: z.string(),
  basis_amount: z.number().nonnegative(),
  location: locationSchema.nullable().optional(),
});

const claimSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  date_of_loss: z.string(),
  paid_expense: z.number().default(0),
  paid_indemnity: z.number().default(0),
  reserve_expense: z.number().default(0),
  reserve_indemnity: z.number().default(0),
});

const policySchema = z.object({
  id: z.union([z.string(), z.number()]),
  premium: z.number().nullable().optional(),
  business_type: z.string().nullable().optional(),
  line_of_business: z.string().nullable().optional(),
  insured: z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    hq: z.object({
      id: z.union([z.string(), z.number()]),
      state: z.string().nullable().optional(),
    }).nullable().optional(),
  }),
  submission: z.object({
    id: z.union([z.string(), z.number()]),
    received_date: z.string(),
    submission_number: z.string(),
  }),
  exposure_units: z.array(exposureSchema).default([]),
  claims: z.array(claimSchema).default([]),
});

const supportedConstruction = new Set([
  "joisted masonry",
  "non-combustible",
  "steel",
  "steel frame",
  "masonry non-combustible",
]);

function isoDate(value: string): string {
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid Federato date: ${value}`);
  return parsed.toISOString();
}

function normalizeBusinessType(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "new") return "New Business";
  if (normalized === "renewal") return "Renewal";
  return value;
}

export function normalizeFederatoPolicy(input: unknown): NormalizedSubmission {
  const policy = policySchema.parse(input);
  const locations = [...new Map(
    policy.exposure_units.flatMap((unit) => unit.location ? [[String(unit.location.id), unit.location] as const] : []),
  ).values()];
  const buildings = [...new Map(
    locations.flatMap((location) => location.buildings.map((building) => [String(building.id), building] as const)),
  ).values()];
  const totalInsuredValue = buildings.length ? buildings.reduce((sum, building) => sum + building.tiv, 0) : null;
  const primaryLocation = locations
    .map((location) => ({ location, tiv: location.buildings.reduce((sum, building) => sum + building.tiv, 0) }))
    .sort((left, right) => right.tiv - left.tiv)[0]?.location;
  const years = buildings.flatMap((building) => building.year_built == null ? [] : [building.year_built]);
  const supportedTiv = buildings
    .filter((building) => supportedConstruction.has(building.construction_type?.trim().toLowerCase() ?? ""))
    .reduce((sum, building) => sum + building.tiv, 0);
  const receivedAt = isoDate(policy.submission.received_date);
  const lossCutoff = new Date(receivedAt);
  lossCutoff.setUTCFullYear(lossCutoff.getUTCFullYear() - 5);
  const uniqueClaims = [...new Map(policy.claims.map((claim, index) => [
    claim.id === undefined
      ? `${claim.date_of_loss}:${claim.paid_expense}:${claim.paid_indemnity}:${claim.reserve_expense}:${claim.reserve_indemnity}:${index}`
      : String(claim.id),
    claim,
  ])).values()];
  const fiveYearLossValue = uniqueClaims
    .filter((claim) => {
      const lossDate = new Date(claim.date_of_loss);
      return !Number.isNaN(lossDate.getTime()) && lossDate >= lossCutoff && lossDate <= new Date(receivedAt);
    })
    .reduce((sum, claim) => sum + claim.paid_expense + claim.paid_indemnity + claim.reserve_expense + claim.reserve_indemnity, 0);

  return {
    id: policy.submission.submission_number,
    accountName: policy.insured.name,
    submissionType: normalizeBusinessType(policy.business_type),
    lineOfBusiness: policy.line_of_business ?? null,
    primaryState: policy.insured.hq?.state ?? primaryLocation?.state ?? null,
    totalInsuredValue,
    premium: policy.premium ?? null,
    buildingYear: years.length ? Math.min(...years) : null,
    supportedConstructionPercentage: totalInsuredValue && totalInsuredValue > 0 ? supportedTiv / totalInsuredValue * 100 : null,
    fiveYearLossValue,
    receivedAt,
    fieldEvidence: {
      submissionType: { resource: "Policy", recordId: String(policy.id), fieldPath: "business_type", rawValue: policy.business_type, provenance: "federato" },
      lineOfBusiness: { resource: "Policy", recordId: String(policy.id), fieldPath: "line_of_business", rawValue: policy.line_of_business, provenance: "federato" },
      primaryState: policy.insured.hq?.state
        ? { resource: "Insured", recordId: String(policy.insured.id), fieldPath: "hq.state", rawValue: policy.insured.hq.state, provenance: "federato" }
        : { resource: "Policy", recordId: String(policy.id), fieldPath: "exposure_units.location.state", rawValue: primaryLocation?.state, provenance: "derived" },
      totalInsuredValue: { resource: "Policy", recordId: String(policy.id), fieldPath: "exposure_units.location.buildings.tiv", rawValue: buildings.map((building) => building.tiv), provenance: "derived", calculation: { operation: "sum", unit: "USD" } },
      premium: { resource: "Policy", recordId: String(policy.id), fieldPath: "premium", rawValue: policy.premium, provenance: "federato" },
      buildingYear: { resource: "Policy", recordId: String(policy.id), fieldPath: "exposure_units.location.buildings.year_built", rawValue: years, provenance: "derived", calculation: { operation: "min", unit: "year" } },
      supportedConstructionPercentage: { resource: "Policy", recordId: String(policy.id), fieldPath: "exposure_units.location.buildings.{construction_type,tiv}", rawValue: buildings.map((building) => ({ constructionType: building.construction_type, tiv: building.tiv })), provenance: "derived", calculation: { operation: "ratio", unit: "percent" } },
      fiveYearLossValue: { resource: "Policy", recordId: String(policy.id), fieldPath: "claims.{date_of_loss,paid_expense,paid_indemnity,reserve_expense,reserve_indemnity}", rawValue: uniqueClaims, provenance: "derived", calculation: { operation: "sum", unit: "USD" } },
    },
  };
}
