export type FederatoScalarType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "unknown";

export type FederatoScalarField = {
  kind: "scalar";
  type: FederatoScalarType;
  nullable?: boolean;
};

export type FederatoReferenceField = {
  kind: "reference";
  resource: string;
  nullable?: boolean;
};

export type FederatoArrayField = {
  kind: "array";
  resource: string;
};

export type FederatoField =
  | FederatoScalarField
  | FederatoReferenceField
  | FederatoArrayField;

export type FederatoResource = {
  name: string;
  fields: Record<string, FederatoField>;
};

/** A normalized, sanitized view of schema discovery. It contains no records or credentials. */
export type FederatoSchema = {
  version?: string;
  resources: Record<string, FederatoResource>;
};
