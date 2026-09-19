import { DecisionQueue } from "@/components/decision-queue";
import { getDemoDecisionPackets } from "@/lib/cache/demo-snapshot";

export default function HomePage() {
  const packets = getDemoDecisionPackets();

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Decision Queue</p>
          <h1>Submissions to review</h1>
          <p>Ranked from cached evidence against the current appetite.</p>
        </div>
        <span className="source-label">Cached demo data</span>
      </div>
      <DecisionQueue packets={packets} />
    </>
  );
}
