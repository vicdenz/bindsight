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
        primaryLocation: { kind: "reference", resource: "Location" },
        locations: { kind: "array", resource: "Location" },
      },
    },
    Location: {
      name: "Location",
      fields: {
        id: { kind: "scalar", type: "string" },
        state: { kind: "scalar", type: "string" },
        tiv: { kind: "scalar", type: "number" },
        buildings: { kind: "array", resource: "Building" },
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
