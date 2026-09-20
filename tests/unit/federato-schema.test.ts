import { describe, expect, it } from "vitest";

import { normalizeFederatoSchema } from "../../lib/federato/schema";

describe("Federato schema normalization", () => {
  it("normalizes the live API itemType form for scalar arrays", () => {
    const schema = normalizeFederatoSchema({
      Location: {
        type: "object",
        fields: {
          hazard_tags: { type: "array", itemType: "string", optional: false },
        },
      },
    });

    expect(schema.resources.Location.fields.hazard_tags).toEqual({
      kind: "array",
      item: { kind: "scalar", type: "string" },
    });
  });

  it("continues to normalize nested itemSchema descriptors", () => {
    const schema = normalizeFederatoSchema({
      Location: {
        type: "object",
        fields: {
          coordinates: {
            type: "array",
            itemSchema: { type: "number", nullable: true },
          },
        },
      },
    });

    expect(schema.resources.Location.fields.coordinates).toEqual({
      kind: "array",
      item: { kind: "scalar", type: "number", nullable: true },
    });
  });

  it("rejects arrays without an item descriptor", () => {
    expect(() => normalizeFederatoSchema({
      Location: { type: "object", fields: { invalid: { type: "array" } } },
    })).toThrow("Location.invalid[] must be a field descriptor");
  });
});
