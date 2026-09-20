export type FederatoScalarType = "string" | "number" | "boolean" | "date" | "datetime" | "unknown";
export type FederatoScalarField = { kind: "scalar"; type: FederatoScalarType; nullable?: boolean };
export type FederatoObjectField = { kind: "object"; fields: Record<string, FederatoField>; nullable?: boolean };
export type FederatoReferenceField = { kind: "reference"; resource: string; cardinality: "one" | "many"; nullable?: boolean };
export type FederatoArrayField = { kind: "array"; item: FederatoField; nullable?: boolean };
export type FederatoField = FederatoScalarField | FederatoObjectField | FederatoReferenceField | FederatoArrayField;
export type FederatoResource = { name: string; fields: Record<string, FederatoField> };
export type FederatoSchema = { version?: string; resources: Record<string, FederatoResource> };

type RawField = {
  type?: unknown;
  fields?: unknown;
  itemSchema?: unknown;
  itemType?: unknown;
  resource?: unknown;
  cardinality?: unknown;
  nullable?: unknown;
};

function normalizeFields(value: unknown, context: string): Record<string, FederatoField> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${context}.fields must be an object`);
  return Object.fromEntries(Object.entries(value).map(([name, field]) => [name, normalizeField(field, `${context}.${name}`)]));
}
function normalizeField(value: unknown, context: string): FederatoField {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${context} must be a field descriptor`);
  const raw = value as RawField;
  const nullable = raw.nullable === true || undefined;
  if (raw.type === "object") return { kind: "object", fields: normalizeFields(raw.fields, context), nullable };
  if (raw.type === "array") {
    const itemDescriptor = raw.itemSchema ?? (typeof raw.itemType === "string" ? { type: raw.itemType } : undefined);
    return { kind: "array", item: normalizeField(itemDescriptor, `${context}[]`), nullable };
  }
  if (raw.type === "reference") {
    if (typeof raw.resource !== "string" || !raw.resource) throw new Error(`${context}.resource must be a non-empty string`);
    if (raw.cardinality !== "one" && raw.cardinality !== "many") throw new Error(`${context}.cardinality must be one or many`);
    return { kind: "reference", resource: raw.resource, cardinality: raw.cardinality, nullable };
  }
  const supported = new Set(["string", "number", "boolean", "date", "datetime"]);
  return { kind: "scalar", type: typeof raw.type === "string" && supported.has(raw.type) ? raw.type as FederatoScalarType : "unknown", nullable };
}

export function normalizeFederatoSchema(input: unknown): FederatoSchema {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Schema response must be an object");
  const resources: Record<string, FederatoResource> = {};
  for (const [name, descriptor] of Object.entries(input)) {
    if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) throw new Error(`Schema resource ${name} must be an object`);
    const raw = descriptor as RawField;
    if (raw.type !== "object") throw new Error(`Schema resource ${name} must have type object`);
    resources[name] = { name, fields: normalizeFields(raw.fields, name) };
  }
  return { resources };
}
