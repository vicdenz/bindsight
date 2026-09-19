import type { ActionTier, DecisionPacket, RuleStatus } from "@/lib/contracts";

const tierLabels: Record<ActionTier, string> = {
  review_now: "Review now",
  standard_review: "Standard review",
  request_information: "Request information",
  manual_review: "Manual review",
  likely_decline: "Likely decline",
};

const statusLabels: Record<RuleStatus, string> = {
  target: "Target",
  pass: "Pass",
  fail: "Fail",
  missing: "Missing",
  conflict: "Conflict",
  not_applicable: "Not applicable",
};

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function DecisionPacketView({ packet }: Readonly<{ packet: DecisionPacket }>) {
  return (
    <article>
      <section className="summary" aria-labelledby="recommendation-heading">
        <div>
          <h2 id="recommendation-heading">Recommendation</h2>
          <p className={`tier tier-${packet.tier}`}>{tierLabels[packet.tier]}</p>
          <p>{packet.explanation}</p>
        </div>
        <dl className="score-list">
          <div><dt>Target alignment</dt><dd>{percentage(packet.score.targetAlignment)}</dd></div>
          <div><dt>Evidence completeness</dt><dd>{percentage(packet.score.evidenceCompleteness)}</dd></div>
          <div><dt>Premium opportunity</dt><dd>{percentage(packet.score.premiumOpportunity)}</dd></div>
          <div><dt>Analysis time</dt><dd>{packet.analysis.latencyMs} ms</dd></div>
        </dl>
      </section>

      {packet.nextBestQuestion && (
        <section aria-labelledby="question-heading">
          <h2 id="question-heading">Next best question</h2>
          <p><strong>{packet.nextBestQuestion.question}</strong></p>
          <p>{packet.nextBestQuestion.rationale}</p>
        </section>
      )}

      <section aria-labelledby="rules-heading">
        <h2 id="rules-heading">Appetite checks</h2>
        <div className="table-scroll">
          <table>
            <thead><tr><th scope="col">Status</th><th scope="col">Rule</th><th scope="col">Reason</th><th scope="col">Sources</th></tr></thead>
            <tbody>
              {packet.atoms.map((atom) => (
                <tr key={atom.id}>
                  <td><span className={`status status-${atom.status}`}>{statusLabels[atom.status]}</span></td>
                  <td><code>{atom.ruleId}</code></td>
                  <td>{atom.reason}</td>
                  <td>{[...atom.evidenceIds, ...atom.calculationIds].join(", ") || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="evidence-heading">
        <h2 id="evidence-heading">Evidence ledger</h2>
        <div className="table-scroll">
          <table>
            <thead><tr><th scope="col">ID</th><th scope="col">Source</th><th scope="col">Field</th><th scope="col">Value</th></tr></thead>
            <tbody>
              {packet.evidence.map((item) => (
                <tr key={item.id} id={item.id}>
                  <th scope="row"><code>{item.id}</code></th>
                  <td>{item.resource} / {item.recordId}</td>
                  <td>{item.fieldPath}</td>
                  <td>{displayValue(item.normalizedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {packet.calculations.length > 0 && (
        <section aria-labelledby="calculations-heading">
          <h2 id="calculations-heading">Calculations</h2>
          <ul>
            {packet.calculations.map((calculation) => (
              <li key={calculation.id} id={calculation.id}>
                <code>{calculation.id}</code>: {calculation.operation}({calculation.inputIds.join(", ")}) = {calculation.result} {calculation.unit}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(packet.qualityIssues.length > 0 || packet.assumptions.length > 0) && (
        <section aria-labelledby="caveats-heading">
          <h2 id="caveats-heading">Data quality and assumptions</h2>
          <ul>
            {packet.qualityIssues.map((issue) => <li key={`issue-${issue}`}>Issue: {issue}</li>)}
            {packet.assumptions.map((assumption) => <li key={`assumption-${assumption}`}>Assumption: {assumption}</li>)}
          </ul>
        </section>
      )}
    </article>
  );
}
