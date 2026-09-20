import { DecisionQueue } from "@/components/decision-queue";
import { getDecisionData } from "@/lib/analysis/live";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { packets, source, warning } = await getDecisionData();

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Decision Queue</p>
          <h1>Submissions to review</h1>
          <p>Ranked from {source === "live" ? "live Federato evidence" : "cached evidence"} against the current appetite.</p>
        </div>
        <span className="source-label">{source === "live" ? "Live Federato data" : "Cached fallback data"}</span>
      </div>
      {warning && <p role="alert" className="empty-state">Data notice: {warning}</p>}
      <DecisionQueue packets={packets} />
    </>
  );
}
