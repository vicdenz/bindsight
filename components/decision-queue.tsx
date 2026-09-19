import Link from "next/link";
import type { ActionTier, DecisionPacket } from "@/lib/contracts";

const tierLabels: Record<ActionTier, string> = {
  review_now: "Review now",
  standard_review: "Standard review",
  request_information: "Request information",
  manual_review: "Manual review",
  likely_decline: "Likely decline",
};

const tierOrder: Record<ActionTier, number> = {
  review_now: 0,
  standard_review: 1,
  request_information: 2,
  manual_review: 3,
  likely_decline: 4,
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

export function DecisionQueue({ packets }: Readonly<{ packets: DecisionPacket[] }>) {
  const ranked = [...packets].sort((left, right) =>
    tierOrder[left.tier] - tierOrder[right.tier]
    || right.score.targetAlignment - left.score.targetAlignment
    || right.score.evidenceCompleteness - left.score.evidenceCompleteness,
  );

  if (ranked.length === 0) {
    return <p role="status" className="empty-state">No cached submissions are available.</p>;
  }

  return (
    <section aria-labelledby="queue-table-heading">
      <h2 id="queue-table-heading" className="sr-only">Ranked submission queue</h2>
      <p className="tier-key">
        Tiers: Review now · Standard review · Request information · Manual review · Likely decline
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Account</th>
              <th scope="col">Action</th>
              <th scope="col">State</th>
              <th scope="col">Premium</th>
              <th scope="col">TIV</th>
              <th scope="col">Target score</th>
              <th scope="col">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((packet, index) => (
              <tr key={packet.submission.id}>
                <td>{index + 1}</td>
                <th scope="row">
                  <Link href={`/submissions/${encodeURIComponent(packet.submission.id)}`}>
                    {packet.submission.accountName}
                  </Link>
                </th>
                <td><span className={`tier tier-${packet.tier}`}>{tierLabels[packet.tier]}</span></td>
                <td>{packet.submission.primaryState ?? "Unknown"}</td>
                <td>{money(packet.submission.premium)}</td>
                <td>{money(packet.submission.totalInsuredValue)}</td>
                <td>{percentage(packet.score.targetAlignment)}</td>
                <td>{percentage(packet.score.evidenceCompleteness)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
