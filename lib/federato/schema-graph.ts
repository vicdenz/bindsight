import type { FederatoField, FederatoResource, FederatoSchema } from "./schema";
export type FieldResolution = { ok: true; field: FederatoField; owner: FederatoResource; traversed: string[] } | { ok: false; message: string };

export class FederatoSchemaGraph {
  constructor(readonly schema: FederatoSchema) {}
  resource(name: string): FederatoResource | undefined { return this.schema.resources[name]; }
  resolveField(resourceName: string, path: string): FieldResolution {
    let resource = this.resource(resourceName);
    if (!resource) return { ok: false, message: `Unknown resource: ${resourceName}` };
    const parts = path.split(".");
    if (parts.some((part) => !part)) return { ok: false, message: `Invalid field path: ${path}` };
    let fields = resource.fields;
    const traversed: string[] = [];
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const field = fields[part];
      if (!field) return { ok: false, message: `Unknown field ${part} on resource ${resource.name}` };
      traversed.push(part);
      if (index === parts.length - 1) return { ok: true, field, owner: resource, traversed };
      if (field.kind === "scalar") return { ok: false, message: `Cannot traverse scalar field: ${traversed.join(".")}` };
      if (field.kind === "array") return { ok: false, message: `Cannot traverse array field without $elemMatch or unwind: ${traversed.join(".")}` };
      if (field.kind === "object") { fields = field.fields; continue; }
      if (field.cardinality === "many") return { ok: false, message: `Cannot traverse array reference without $elemMatch, expand, or unwind: ${traversed.join(".")}` };
      const next = this.resource(field.resource);
      if (!next) return { ok: false, message: `Reference ${traversed.join(".")} targets unknown resource ${field.resource}` };
      resource = next;
      fields = next.fields;
    }
    return { ok: false, message: `Invalid field path: ${path}` };
  }
}
