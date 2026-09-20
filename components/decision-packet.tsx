import Link from "next/link";
import type { ActionTier, DecisionPacket, RuleStatus } from "@/lib/contracts";

const tierLabels: Record<ActionTier, string> = {
  review_now: "Review now",
  standard_review: "Standard review",
  request_information: "Request information",
  manual_review: "Manual review",
  outside_appetite: "Outside appetite",
  screened_out: "Renewal workflow",
  not_evaluated: "No matching profile",
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
  const packetJsonUrl = `/api/submissions/${encodeURIComponent(packet.submission.id)}/decision`;

  return (
    <article>
      <section className="summary" aria-labelledby="recommendation-heading">
        <div>
          <h2 id="recommendation-heading">Assessment</h2>
          <p className={`tier tier-${packet.tier}`}>{tierLabels[packet.tier]}</p>
          <p>{packet.explanation}</p>
          <p>{packet.screening.reason}</p>
          <p>
            <Link href="/appetite">View appetite sources</Link>
            {" · "}<a href={packetJsonUrl}>View packet JSON</a>
          </p>
        </div>
        {packet.screening.status === "evaluated" ? (
          <dl className="score-list">
            <div><dt>Target alignment</dt><dd>{percentage(packet.score.targetAlignment)}</dd></div>
            <div><dt>Evidence completeness</dt><dd>{percentage(packet.score.evidenceCompleteness)}</dd></div>
            <div><dt>Premium opportunity</dt><dd>{percentage(packet.score.premiumOpportunity)}</dd></div>
            <div><dt>Source status</dt><dd>{packet.submission.sourceStatus ?? "Unknown"}</dd></div>
            <div><dt>Assessment mode</dt><dd>{packet.analysis.mode}</dd></div>
            <div><dt>Analysis time</dt><dd>{packet.analysis.latencyMs} ms</dd></div>
          </dl>
        ) : (
          <dl className="score-list">
            <div><dt>Submission type</dt><dd>{packet.submission.submissionType ?? "Unknown"}</dd></div>
            <div><dt>Line</dt><dd>{packet.submission.lineOfBusiness ?? "Unknown"}</dd></div>
            <div><dt>Source status</dt><dd>{packet.submission.sourceStatus ?? "Unknown"}</dd></div>
            <div><dt>Profile</dt><dd>{packet.screening.profileId ?? "None"}</dd></div>
          </dl>
        )}
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
                  <td><Link href={`/appetite#${encodeURIComponent(atom.ruleId)}`}><code>{atom.ruleId}</code></Link></td>
                  <td>{atom.reason}</td>
                  <td>
                    {[...atom.evidenceIds, ...atom.calculationIds].length > 0
                      ? [...atom.evidenceIds, ...atom.calculationIds].map((id, index) => (
                          <span key={id}>{index > 0 && ", "}<a href={`#${encodeURIComponent(id)}`}><code>{id}</code></a></span>
                        ))
                      : "None"}
                  </td>
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
            <thead><tr><th scope="col">ID</th><th scope="col">Source</th><th scope="col">Field</th><th scope="col">Normalized</th><th scope="col">Raw source value</th></tr></thead>
            <tbody>
              {packet.evidence.map((item) => (
                <tr key={item.id} id={item.id}>
                  <th scope="row"><a href={`#${encodeURIComponent(item.id)}`}><code>{item.id}</code></a></th>
                  <td><a href={packetJsonUrl}>{item.resource} / {item.recordId}</a></td>
                  <td>{item.fieldPath}</td>
                  <td>{displayValue(item.normalizedValue)}</td>
                  <td><details><summary>View raw</summary><code>{displayValue(item.rawValue)}</code></details></td>
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
                <a href={`#${encodeURIComponent(calculation.id)}`}><code>{calculation.id}</code></a>: {calculation.operation}(
                {calculation.inputIds.map((id, index) => <span key={id}>{index > 0 && ", "}<a href={`#${encodeURIComponent(id)}`}><code>{id}</code></a></span>)}) = {calculation.result} {calculation.unit}
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

      <section id="source-context" aria-labelledby="source-context-heading">
        <h2 id="source-context-heading">Source context</h2>
        <p>
          Evidence marked Federato was retrieved from the expanded policy/submission graph. Derived values retain their raw inputs above.
          {" "}<a href={packetJsonUrl}>Open this complete decision packet as JSON</a> or{" "}
          <Link href="/appetite">inspect the versioned appetite rules and source wording</Link>.
        </p>
      </section>
    </article>
  );
}
