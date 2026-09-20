"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { ActionTier, DecisionPacket } from "@/lib/contracts";

const tierLabels: Record<ActionTier, string> = {
  review_now: "Review now",
  standard_review: "Standard review",
  request_information: "Request information",
  manual_review: "Manual review",
  outside_appetite: "Outside appetite",
  screened_out: "Renewal workflow",
  not_evaluated: "No matching profile",
};

const tierOrder: Record<ActionTier, number> = {
  review_now: 0,
  standard_review: 1,
  request_information: 2,
  manual_review: 3,
  outside_appetite: 4,
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

function QueueTable({
  packets,
  showScores,
  emptyMessage,
}: Readonly<{
  packets: readonly DecisionPacket[];
  showScores: boolean;
  emptyMessage: string;
}>) {
  if (packets.length === 0) {
    return <p className="cohort-empty" role="status">{emptyMessage}</p>;
  }

  return (
    <div className="table-scroll">
      <table className="queue-table">
        <caption className="sr-only">Ranked underwriting submissions</caption>
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">Rank</span></th>
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
            <tr className={`queue-row row-${packet.tier}`} key={packet.submission.id}>
              <td className="rank-cell" data-label="Rank">{String(index + 1).padStart(2, "0")}</td>
              <th scope="row" data-label="Account">
                <Link href={`/submissions/${encodeURIComponent(packet.submission.id)}`}>
                  {packet.submission.accountName}
                </Link>
                <small>{packet.submission.id}</small>
              </th>
              <td data-label="Treatment"><span className={`tier tier-${packet.tier}`}>{tierLabels[packet.tier]}</span></td>
              <td data-label="Line">{packet.submission.lineOfBusiness ?? "Unknown"}</td>
              <td data-label="State">{packet.submission.primaryState ?? "Unknown"}</td>
              <td className="number-cell" data-label="Premium">{money(packet.submission.premium)}</td>
              <td className="number-cell" data-label="TIV">{money(packet.submission.totalInsuredValue)}</td>
              {showScores && <td className="score-cell" data-label="Target score"><span style={{ "--score": packet.score.targetAlignment } as CSSProperties}>{percentage(packet.score.targetAlignment)}</span></td>}
              <td className="score-cell" data-label="Evidence"><span style={{ "--score": packet.score.evidenceCompleteness } as CSSProperties}>{percentage(packet.score.evidenceCompleteness)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DecisionQueue({ packets }: Readonly<{ packets: DecisionPacket[] }>) {
  const [query, setQuery] = useState("");
  const [treatment, setTreatment] = useState<ActionTier | "all">("all");

  const candidates = packets.filter((packet) => packet.screening.status === "evaluated");
  const renewals = packets.filter((packet) => packet.screening.status === "renewal");
  const unsupported = packets.filter((packet) => packet.screening.status === "unsupported_line");
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return packets.filter((packet) => {
      const matchesTreatment = treatment === "all" || packet.tier === treatment;
      const searchable = [
        packet.submission.accountName,
        packet.submission.id,
        packet.submission.lineOfBusiness,
        packet.submission.primaryState,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesTreatment && (normalizedQuery.length === 0 || searchable.includes(normalizedQuery));
    });
  }, [packets, query, treatment]);

  const filteredCandidates = filtered.filter((packet) => packet.screening.status === "evaluated");
  const filteredRenewals = filtered.filter((packet) => packet.screening.status === "renewal");
  const filteredUnsupported = filtered.filter((packet) => packet.screening.status === "unsupported_line");
  const activeFilterCount = Number(query.trim().length > 0) + Number(treatment !== "all");

  if (packets.length === 0) {
    return <p role="status" className="empty-state">No submissions are available.</p>;
  }

  return (
    <>
      <nav className="cohort-nav" aria-label="Submission cohorts">
        <Link href="#candidates">
          <span>New property</span>
          <strong>{candidates.length}</strong>
          <small>Evaluated against property rules</small>
        </Link>
        <Link href="#renewals">
          <span>Renewals</span>
          <strong>{renewals.length}</strong>
          <small>Reviewed in a separate workflow</small>
        </Link>
        <Link href="#unsupported-lines">
          <span>Other lines</span>
          <strong>{unsupported.length}</strong>
          <small>Needs a matching appetite profile</small>
        </Link>
        <Link className="cohort-source-link" href="/appetite">
          <span>Rules in force</span>
          <strong>Open</strong>
          <small>Sources and versions</small>
        </Link>
      </nav>

      <form className="queue-tools" role="search" onSubmit={(event) => event.preventDefault()}>
        <label>
          <span>Find an account</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, submission ID, line, or state"
          />
        </label>
        <label>
          <span>Treatment</span>
          <select value={treatment} onChange={(event) => setTreatment(event.target.value as ActionTier | "all")}>
            <option value="all">All treatments</option>
            {Object.entries(tierLabels).map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </label>
        <p className="filter-result" aria-live="polite">
          <strong>{filtered.length}</strong> of {packets.length} shown
        </p>
        <button
          className="quiet-button"
          type="button"
          disabled={activeFilterCount === 0}
          onClick={() => { setQuery(""); setTreatment("all"); }}
        >
          Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </form>

      <section className="cohort-section cohort-candidates" id="candidates" aria-labelledby="candidates-heading">
        <header className="section-heading">
          <span className="section-tab" aria-hidden="true" />
          <div>
            <h2 id="candidates-heading">New property candidates</h2>
            <p>Property rules apply here. “Outside appetite” is a rules result, not a final carrier decision.</p>
          </div>
          <strong className="section-count">{filteredCandidates.length}<small>shown</small></strong>
        </header>
        <QueueTable packets={filteredCandidates} showScores emptyMessage="No new-property candidates match these filters." />
      </section>

      <section className="cohort-section cohort-renewals" id="renewals" aria-labelledby="renewals-heading">
        <header className="section-heading">
          <span className="section-tab" aria-hidden="true" />
          <div>
            <h2 id="renewals-heading">Renewals</h2>
            <p>Reviewed separately. New-business gates are not applied.</p>
          </div>
          <strong className="section-count">{filteredRenewals.length}<small>shown</small></strong>
        </header>
        <QueueTable packets={filteredRenewals} showScores={false} emptyMessage="No renewals match these filters." />
      </section>

      <section className="cohort-section cohort-unsupported" id="unsupported-lines" aria-labelledby="unsupported-heading">
        <header className="section-heading">
          <span className="section-tab" aria-hidden="true" />
          <div>
            <h2 id="unsupported-heading">Other lines without a loaded profile</h2>
            <p>Sent to manual review until a matching appetite profile is loaded.</p>
          </div>
          <strong className="section-count">{filteredUnsupported.length}<small>shown</small></strong>
        </header>
        <QueueTable packets={filteredUnsupported} showScores={false} emptyMessage="No other-line submissions match these filters." />
      </section>
    </>
  );
}
