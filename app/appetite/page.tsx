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
      <p><Link href="/">← Back to decision queue</Link></p>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Appetite Studio</p>
          <h1>Versioned appetite rules</h1>
          <p>Deterministic preview of a strategy change using cached submissions.</p>
        </div>
        <span className="source-label">Cached simulation</span>
      </div>

      <section aria-labelledby="current-profile-heading">
        <h2 id="current-profile-heading">Current commercial-property profile</h2>
        <p>
          Version <code>{APPETITE_VERSION}</code>, transcribed from the supplied Hack the North 2026
          <code> APPETITE_GUIDELINES.pdf</code>. Each decision packet links directly to the applicable rule below.
        </p>
        {currentRules.map((rule) => (
          <article className="empty-state source-rule" id={rule.id} key={rule.id}>
            <h3>{rule.concept} <a href={`#${rule.id}`}><code>{rule.id}</code></a></h3>
            <blockquote>{rule.sourceText}</blockquote>
            <p><strong>Scope:</strong> {rule.scope} · <strong>Version:</strong> {rule.version}</p>
            {rule.ambiguity && <p><strong>Documented ambiguity:</strong> {rule.ambiguity}</p>}
          </article>
        ))}
      </section>

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
