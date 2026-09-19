import type { Calculation, DecisionAtom, EvidenceItem } from "../contracts";
import { validateCalculations } from "./calculations";
import { validateEvidenceLedger } from "./ledger";

export function validateDecisionReferences(
  atoms: readonly DecisionAtom[],
  evidence: readonly EvidenceItem[],
  calculations: readonly Calculation[],
): string[] {
  const errors = [...validateEvidenceLedger(evidence), ...validateCalculations(calculations, evidence)];
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const calculationIds = new Set(calculations.map((item) => item.id));
  const atomIds = new Set<string>();

  for (const atom of atoms) {
    if (atomIds.has(atom.id)) errors.push(`Duplicate decision atom ID: ${atom.id}`);
    atomIds.add(atom.id);
    for (const id of atom.evidenceIds) if (!evidenceIds.has(id)) errors.push(`Atom ${atom.id} references unknown evidence ${id}`);
    for (const id of atom.calculationIds) if (!calculationIds.has(id)) errors.push(`Atom ${atom.id} references unknown calculation ${id}`);
  }
  return errors;
}
