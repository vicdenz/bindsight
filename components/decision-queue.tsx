import Link from "next/link";
import type { ActionTier, DecisionPacket } from "@/lib/contracts";

const tierLabels: Record<ActionTier, string> = {
  review_now: "Review now",
  standard_review: "Standard review",
  request_information: "Request information",
  manual_review: "Manual review",
  likely_decline: "Outside appetite",
  screened_out: "Renewal workflow",
  not_evaluated: "No matching profile",
};

const tierOrder: Record<ActionTier, number> = {
  review_now: 0,
  standard_review: 1,
  request_information: 2,
  manual_review: 3,
  likely_decline: 4,
  screened_out: 5,
  not_evaluated: 6,
};

function money(value: number | null): string {
  if (value === null) return "Unknown";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function ranked(packets: readonly DecisionPacket[]): DecisionPacket[] {
  return [...packets].sort((left, right) =>
    tierOrder[left.tier] - tierOrder[right.tier]
    || right.score.targetAlignment - left.score.targetAlignment
    || right.score.evidenceCompleteness - left.score.evidenceCompleteness,
  );
}

function QueueTable({ packets, showScores }: Readonly<{ packets: readonly DecisionPacket[]; showScores: boolean }>) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Account</th>
            <th scope="col">Treatment</th>
            <th scope="col">Line</th>
            <th scope="col">State</th>
            <th scope="col">Premium</th>
            <th scope="col">TIV</th>
            {showScores && <th scope="col">Target score</th>}
            <th scope="col">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {ranked(packets).map((packet, index) => (
            <tr key={packet.submission.id}>
              <td>{index + 1}</td>
              <th scope="row">
                <Link href={`/submissions/${encodeURIComponent(packet.submission.id)}`}>
                  {packet.submission.accountName}
                </Link>
              </th>
              <td><span className={`tier tier-${packet.tier}`}>{tierLabels[packet.tier]}</span></td>
              <td>{packet.submission.lineOfBusiness ?? "Unknown"}</td>
              <td>{packet.submission.primaryState ?? "Unknown"}</td>
              <td>{money(packet.submission.premium)}</td>
              <td>{money(packet.submission.totalInsuredValue)}</td>
              {showScores && <td>{percentage(packet.score.targetAlignment)}</td>}
              <td>{percentage(packet.score.evidenceCompleteness)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DecisionQueue({ packets }: Readonly<{ packets: DecisionPacket[] }>) {
  if (packets.length === 0) {
    return <p role="status" className="empty-state">No submissions are available.</p>;
  }

  const candidates = packets.filter((packet) => packet.screening.status === "evaluated");
  const renewals = packets.filter((packet) => packet.screening.status === "renewal");
  const unsupported = packets.filter((packet) => packet.screening.status === "unsupported_line");

  return (
    <>
      <nav className="cohort-nav" aria-label="Submission cohorts">
        <Link href="#candidates">New property candidates ({candidates.length})</Link>
        <Link href="#renewals">Renewals ({renewals.length})</Link>
        <Link href="#unsupported-lines">Other lines ({unsupported.length})</Link>
        <Link href="/appetite">View appetite sources</Link>
      </nav>

      <section id="candidates" aria-labelledby="candidates-heading">
        <h2 id="candidates-heading">New property candidates</h2>
        <p>Only this cohort is evaluated against the commercial-property appetite profile. “Outside appetite” is a rule result, not a prediction of the carrier&apos;s final decision.</p>
        <QueueTable packets={candidates} showScores />
      </section>

      <section id="renewals" aria-labelledby="renewals-heading">
        <h2 id="renewals-heading">Renewals</h2>
        <p>Renewals are separated from new business and are not run through the remaining new-business gates.</p>
        <QueueTable packets={renewals} showScores={false} />
      </section>

      <section id="unsupported-lines" aria-labelledby="unsupported-heading">
        <h2 id="unsupported-heading">Other lines without a loaded appetite profile</h2>
        <p>These records are retained for auditability but are not evaluated with property-specific rules.</p>
        <QueueTable packets={unsupported} showScores={false} />
      </section>
    </>
  );
}
