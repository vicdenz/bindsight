import { describe, expect, it } from "vitest";

import { normalizeFederatoPolicy } from "../../lib/analysis/federato-normalizer";
import { analyzeSubmission } from "../../lib/analysis/analyze";

describe("live Federato policy normalization", () => {
  it("derives conservative appetite inputs from expanded policy evidence", () => {
    const normalized = normalizeFederatoPolicy({
      id: 1001,
      premium: 85_000,
      business_type: "new",
      line_of_business: "property",
      insured: { id: 1, name: "Example Manufacturing", hq: { id: 9, state: "CA" } },
      submission: { id: 2, received_date: "2026-04-08", submission_number: "SUB-2" },
      exposure_units: [
        {
          kind: "location",
          basis_amount: 60_000_000,
          location: {
            id: 10,
            state: "OH",
            buildings: [
              { id: 100, tiv: 60_000_000, year_built: 2015, construction_type: "Steel Frame" },
            ],
          },
        },
        {
          kind: "duplicate-location-reference",
          basis_amount: 60_000_000,
          location: {
            id: 10,
            state: "OH",
            buildings: [
              { id: 100, tiv: 60_000_000, year_built: 2015, construction_type: "Steel Frame" },
            ],
          },
        },
        {
          kind: "location",
          basis_amount: 20_000_000,
          location: {
            id: 11,
            state: "PA",
            buildings: [
              { id: 101, tiv: 20_000_000, year_built: 1989, construction_type: "Frame" },
            ],
          },
        },
      ],
      claims: [
        { id: 1, date_of_loss: "2024-01-01", paid_expense: 1_000, paid_indemnity: 4_000, reserve_expense: 2_000, reserve_indemnity: 3_000 },
        { id: 1, date_of_loss: "2024-01-01", paid_expense: 1_000, paid_indemnity: 4_000, reserve_expense: 2_000, reserve_indemnity: 3_000 },
        { date_of_loss: "2019-01-01", paid_expense: 99_000, paid_indemnity: 0, reserve_expense: 0, reserve_indemnity: 0 },
      ],
    });

    expect(normalized).toMatchObject({
      id: "SUB-2",
      accountName: "Example Manufacturing",
      submissionType: "New Business",
      lineOfBusiness: "property",
      primaryState: "CA",
      totalInsuredValue: 80_000_000,
      premium: 85_000,
      buildingYear: 1989,
      supportedConstructionPercentage: 75,
      fiveYearLossValue: 10_000,
      receivedAt: "2026-04-08T00:00:00.000Z",
    });

    expect(normalized.fieldEvidence?.primaryState).toMatchObject({
      resource: "Insured",
      fieldPath: "hq.state",
      rawValue: "CA",
    });
    expect(normalized.fieldEvidence?.supportedConstructionPercentage?.rawValue).toHaveLength(2);

    const packet = analyzeSubmission(normalized, undefined, {
      source: "live",
      retrievedAt: "2026-04-08T12:00:00.000Z",
    });
    expect(packet.calculations.map((calculation) => calculation.operation)).toEqual(["sum", "min", "ratio", "sum"]);
    expect(packet.atoms.find((atom) => atom.ruleId === "R-TIV")?.calculationIds).toEqual([
      "C-SUB-2-totalInsuredValue",
    ]);
    expect(packet.evidence.find((item) => item.fieldPath === "premium")).toMatchObject({
      resource: "Policy",
      recordId: "1001",
      rawValue: 85_000,
      provenance: "federato",
    });
  });
});
