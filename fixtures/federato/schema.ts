import type { FederatoSchema } from "../../lib/federato/schema";

export const sanitizedFederatoSchema: FederatoSchema = {
  version: "fixture-v1",
  resources: {
    Policy: {
      name: "Policy",
      fields: {
        id: { kind: "scalar", type: "string" },
        accountName: { kind: "scalar", type: "string" },
        premium: { kind: "scalar", type: "number", nullable: true },
        effectiveDate: { kind: "scalar", type: "date" },
        primaryLocation: { kind: "reference", resource: "Location", cardinality: "one" },
        locations: { kind: "reference", resource: "Location", cardinality: "many" },
        dates: { kind: "object", fields: { effective: { kind: "scalar", type: "date" } } },
      },
    },
    Location: {
      name: "Location",
      fields: {
        id: { kind: "scalar", type: "string" },
        state: { kind: "scalar", type: "string" },
        tiv: { kind: "scalar", type: "number" },
        buildings: { kind: "reference", resource: "Building", cardinality: "many" },
        hazardTags: { kind: "array", item: { kind: "scalar", type: "string" } },
      },
    },
    Building: {
      name: "Building",
      fields: {
        id: { kind: "scalar", type: "string" },
        yearBuilt: { kind: "scalar", type: "number", nullable: true },
        construction: { kind: "scalar", type: "string", nullable: true },
      },
    },
  },
};
