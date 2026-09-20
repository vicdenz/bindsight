import { DecisionQueue } from "@/components/decision-queue";
import { getDecisionData } from "@/lib/analysis/live";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { packets, source, summary, warning } = await getDecisionData();

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="page-kicker">Decision queue</p>
          <h1>Underwriting portfolio triage</h1>
          <p className="page-deck">Find the accounts that need attention, then open a packet to see the evidence behind its treatment.</p>
        </div>
        <div className="source-ticket">
          <span className="source-label">
            {source === "live" && summary.assessmentMode === "retrospective" ? "Retrospective Federato assessment" : source === "live" ? "Live Federato data" : "Cached fallback data"}
          </span>
          <small>{summary.total} submissions routed</small>
        </div>
      </div>
      {warning && <p role="alert" className="notice notice-warning"><strong>Data notice</strong>{warning}</p>}
      <DecisionQueue packets={packets} />
    </>
  );
}
