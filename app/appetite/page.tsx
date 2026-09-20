import Link from "next/link";

import { californiaTargetToAcceptableDiff } from "@/lib/analysis/appetite-studio";

function tierLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function AppetiteStudioPage() {
  const appetiteDiff = californiaTargetToAcceptableDiff();

  return (
    <>
      <p><Link href="/">← Back to decision queue</Link></p>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Appetite Studio</p>
          <h1>Versioned appetite rules</h1>
          <p>Deterministic preview of a strategy change using cached submissions.</p>
        </div>
        <span className="source-label">Cached simulation</span>
      </div>

      <section>
        <h2>Proposed change</h2>
        <blockquote>{appetiteDiff.sourceText}</blockquote>
        <p>{appetiteDiff.oldVersion} → {appetiteDiff.newVersion}</p>
      </section>

      <section>
        <h2>Rule changes</h2>
        {appetiteDiff.ruleChanges.map((change) => (
          <article className="empty-state" key={change.ruleId}>
            <h3>{change.concept} <code>{change.ruleId}</code></h3>
            <p>California is removed from the target predicate while remaining acceptable.</p>
            {change.after.ambiguity && <p><strong>Ambiguity:</strong> {change.after.ambiguity}</p>}
          </article>
        ))}
      </section>

      <section>
        <h2>Affected submissions</h2>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Account</th><th>Old tier</th><th>New tier</th><th>Changed rules</th></tr></thead>
            <tbody>
              {appetiteDiff.affectedPackets.map((change) => (
                <tr key={change.submissionId}>
                  <td><Link href={`/submissions/${change.submissionId}`}>{change.accountName}</Link></td>
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
