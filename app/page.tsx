import { DecisionQueue } from "@/components/decision-queue";
import { getDecisionData } from "@/lib/analysis/live";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { packets, source, summary, warning } = await getDecisionData();

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Decision Queue</p>
          <h1>Underwriting portfolio triage</h1>
          <p>Segmented from {source === "live" ? "live Federato evidence" : "cached evidence"}: new property candidates, renewals, and lines without a loaded profile.</p>
        </div>
        <span className="source-label">
          {source === "live" && summary.assessmentMode === "retrospective" ? "Retrospective Federato assessment" : source === "live" ? "Live Federato data" : "Cached fallback data"}
        </span>
      </div>
      {warning && <p role="alert" className="empty-state">Data notice: {warning}</p>}
      <DecisionQueue packets={packets} />
    </>
  );
}
