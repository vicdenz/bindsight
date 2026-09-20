import type { AppetiteRule } from "../contracts";

export const APPETITE_VERSION = "2025.1";
export const CA_ACCEPTABLE_VERSION = "2025.2-ca-acceptable";

const acceptableStates = ["OH", "PA", "MD", "CO", "CA", "FL", "NC", "SC", "GA", "VA", "UT"];
const targetStates = ["OH", "PA", "MD", "CO", "CA", "FL"];

function base(id: string, concept: string, sourceText: string, version: string): Pick<AppetiteRule, "id" | "version" | "concept" | "scope" | "sourceText" | "missingBehavior" | "ambiguity" | "hardGate"> {
  return { id, version, concept, scope: "submission", sourceText, missingBehavior: "request_information", ambiguity: null, hardGate: true };
}

export function getAppetiteRules(version = APPETITE_VERSION): AppetiteRule[] {
  const targets = version === CA_ACCEPTABLE_VERSION ? targetStates.filter((state) => state !== "CA") : targetStates;
  return [
    { ...base("R-BUSINESS-TYPE", "submission type", "New business acceptable; renewal unacceptable.", version), acceptable: [{ operator: "eq", value: "NEW BUSINESS" }], target: [], unacceptable: [{ operator: "eq", value: "RENEWAL" }] },
    { ...base("R-LINE", "line of business", "Property acceptable; other lines unacceptable.", version), acceptable: [{ operator: "eq", value: "PROPERTY" }], target: [], unacceptable: [{ operator: "neq", value: "PROPERTY" }] },
    { ...base("R-STATE", "primary state", "Eleven states acceptable; OH, PA, MD, CO, CA, FL target.", version), acceptable: [{ operator: "in", value: acceptableStates }], target: [{ operator: "in", value: targets }], unacceptable: [{ operator: "not_in", value: acceptableStates }] },
    { ...base("R-TIV", "total insured value", "Up to $150M acceptable; $50M–$100M target; over $150M unacceptable.", version), acceptable: [{ operator: "lte", value: 150_000_000, unit: "USD" }], target: [{ operator: "between", value: [50_000_000, 100_000_000], unit: "USD" }], unacceptable: [{ operator: "gt", value: 150_000_000, unit: "USD" }] },
    { ...base("R-PREMIUM", "premium", "$50K–$175K acceptable; $75K–$100K target.", version), acceptable: [{ operator: "between", value: [50_000, 175_000], unit: "USD" }], target: [{ operator: "between", value: [75_000, 100_000], unit: "USD" }], unacceptable: [{ operator: "lt", value: 50_000, unit: "USD" }, { operator: "gt", value: 175_000, unit: "USD" }] },
    { ...base("R-BUILDING-YEAR", "building year", "Newer than 1990 acceptable; newer than 2010 target; older than 1990 unacceptable.", version), scope: "building", acceptable: [{ operator: "gt", value: 1990 }], target: [{ operator: "gt", value: 2010 }], unacceptable: [{ operator: "lt", value: 1990 }], ambiguity: "Exactly 1990 is unspecified; exactly 2010 is acceptable, not target." },
    { ...base("R-CONSTRUCTION", "supported construction percentage", "More than 50% supported construction acceptable; more than 50% other types unacceptable.", version), scope: "building", acceptable: [{ operator: "percentage_gt", value: 50, unit: "percent" }], target: [], unacceptable: [{ operator: "lt", value: 50, unit: "percent" }], ambiguity: "Exactly 50% is unspecified." },
    { ...base("R-LOSS", "five-year loss value", "Under $100K acceptable; over $100K unacceptable.", version), acceptable: [{ operator: "lt", value: 100_000, unit: "USD" }], target: [], unacceptable: [{ operator: "gt", value: 100_000, unit: "USD" }], ambiguity: "Exactly $100,000 is unspecified." },
  ];
}
