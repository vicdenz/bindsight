import { createHash } from "node:crypto";

import {
  evidenceItemSchema,
  type EvidenceItem,
} from "../contracts";

export type EvidenceDraft = Omit<EvidenceItem, "id"> & { id?: string };

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function evidenceIdFor(draft: Omit<EvidenceItem, "id">): string {
  const identity = [
    draft.resource,
    draft.recordId,
    draft.fieldPath,
    stableValue(draft.normalizedValue),
    draft.provenance,
  ].join("\u001f");
  return `E-${createHash("sha256").update(identity).digest("hex").slice(0, 12)}`;
}

export function createEvidenceItem(draft: EvidenceDraft): EvidenceItem {
  return evidenceItemSchema.parse({
    ...draft,
    id: draft.id ?? evidenceIdFor(draft),
  });
}

export function validateEvidenceLedger(items: readonly EvidenceItem[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    const result = evidenceItemSchema.safeParse(item);
    if (!result.success) errors.push(`Evidence at index ${index} is invalid: ${result.error.message}`);
    if (ids.has(item.id)) errors.push(`Duplicate evidence ID: ${item.id}`);
    ids.add(item.id);
  }
  return errors;
}
