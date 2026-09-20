import Link from "next/link";

import { californiaTargetToAcceptableDiff } from "@/lib/analysis/appetite-studio";
import { APPETITE_VERSION, getAppetiteRules } from "@/lib/appetite/rules";

function tierLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function AppetiteStudioPage() {
  const appetiteDiff = californiaTargetToAcceptableDiff();
  const currentRules = getAppetiteRules();

  return (
    <>
      <p className="back-link"><Link href="/">Back to decision queue</Link></p>
      <div className="page-heading">
        <div>
          <p className="page-kicker">Appetite Studio</p>
          <h1>Versioned appetite rules</h1>
          <p className="page-deck">Inspect the source language, trace every rule, and preview a strategy change before it reaches the queue.</p>
        </div>
        <div className="source-ticket"><span className="source-label">Cached simulation</span><small>Deterministic preview</small></div>
      </div>

      <section className="studio-section" aria-labelledby="current-profile-heading">
        <header className="studio-heading"><h2 id="current-profile-heading">Current commercial-property profile</h2><span>{currentRules.length} rules</span></header>
        <p>
          Version <code>{APPETITE_VERSION}</code>, transcribed from the supplied Hack the North 2026
          <code> APPETITE_GUIDELINES.pdf</code>. Each decision packet links directly to the applicable rule below.
        </p>
        <div className="rule-stack">
          {currentRules.map((rule) => (
            <article className="rule-card source-rule" id={rule.id} key={rule.id}>
              <header><h3>{rule.concept}</h3><a href={`#${rule.id}`}><code>{rule.id}</code></a></header>
              <blockquote>{rule.sourceText}</blockquote>
              <dl><div><dt>Scope</dt><dd>{rule.scope}</dd></div><div><dt>Version</dt><dd>{rule.version}</dd></div></dl>
              {rule.ambiguity && <p className="rule-ambiguity"><strong>Documented ambiguity</strong>{rule.ambiguity}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="studio-section proposed-change">
        <header className="studio-heading"><h2>Proposed change</h2><span>{appetiteDiff.oldVersion} to {appetiteDiff.newVersion}</span></header>
        <blockquote>{appetiteDiff.sourceText}</blockquote>
      </section>

      <section className="studio-section">
        <header className="studio-heading"><h2>Rule changes</h2><span>{appetiteDiff.ruleChanges.length} change</span></header>
        {appetiteDiff.ruleChanges.map((change) => (
          <article className="rule-card" key={change.ruleId}>
            <h3>{change.concept} <code>{change.ruleId}</code></h3>
            <p>California is removed from the target predicate while remaining acceptable.</p>
            {change.after.ambiguity && <p><strong>Ambiguity:</strong> {change.after.ambiguity}</p>}
          </article>
        ))}
      </section>

      <section className="studio-section">
        <header className="studio-heading"><h2>Affected submissions</h2><span>{appetiteDiff.affectedPackets.length} records</span></header>
        <div className="table-scroll">
          <table className="detail-table">
            <caption className="sr-only">Submissions affected by the proposed appetite change</caption>
            <thead><tr><th scope="col">Account</th><th scope="col">Old tier</th><th scope="col">New tier</th><th scope="col">Changed rules</th></tr></thead>
            <tbody>
              {appetiteDiff.affectedPackets.map((change) => (
                <tr key={change.submissionId}>
                  <th scope="row"><Link href={`/submissions/${change.submissionId}`}>{change.accountName}</Link></th>
                  <td>{tierLabel(change.oldTier)}</td>
                  <td>{tierLabel(change.newTier)}</td>
                  <td>{change.changedAtoms.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
