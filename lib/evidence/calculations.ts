import {
  calculationSchema,
  type Calculation,
  type EvidenceItem,
} from "../contracts";

export function validateCalculations(
  calculations: readonly Calculation[],
  evidence: readonly EvidenceItem[],
): string[] {
  const errors: string[] = [];
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const calculationIds = new Set<string>();

  for (const [index, calculation] of calculations.entries()) {
    const result = calculationSchema.safeParse(calculation);
    if (!result.success) errors.push(`Calculation at index ${index} is invalid: ${result.error.message}`);
    if (calculationIds.has(calculation.id)) errors.push(`Duplicate calculation ID: ${calculation.id}`);
    for (const inputId of calculation.inputIds) {
      if (!evidenceIds.has(inputId) && !calculationIds.has(inputId)) {
        errors.push(`Calculation ${calculation.id} references unknown or forward input ${inputId}`);
      }
    }
    calculationIds.add(calculation.id);
  }
  return errors;
}

export function calculate(
  id: string,
  operation: Calculation["operation"],
  inputs: readonly EvidenceItem[],
  unit: string,
): Calculation {
  const numbers = inputs.map((item) => Number(item.normalizedValue));
  if (operation !== "count" && numbers.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`Calculation ${id} requires finite numeric inputs`);
  }

  let result: number;
  switch (operation) {
    case "sum": result = numbers.reduce((total, value) => total + value, 0); break;
    case "count": result = inputs.length; break;
    case "difference":
      if (numbers.length !== 2) throw new RangeError("difference requires exactly two inputs");
      result = numbers[0] - numbers[1];
      break;
    case "ratio":
      if (numbers.length !== 2 || numbers[1] === 0) throw new RangeError("ratio requires two inputs and a non-zero divisor");
      result = numbers[0] / numbers[1];
      break;
    case "identity":
      if (numbers.length !== 1) throw new RangeError("identity requires exactly one input");
      result = numbers[0];
      break;
  }

  return calculationSchema.parse({ id, operation, inputIds: inputs.map((item) => item.id), unit, result });
}
