import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionPacketView } from "@/components/decision-packet";
import { ReviewerPanel } from "@/components/reviewer-panel";
import { getDecisionPacket } from "@/lib/analysis/live";

export const dynamic = "force-dynamic";

export default async function SubmissionPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const { packet, source, warning } = await getDecisionPacket(id);
  if (!packet) notFound();

  return (
    <>
      <p><Link href="/">← Back to decision queue</Link></p>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Decision Packet</p>
          <h1>{packet.submission.accountName}</h1>
          <p>Submission {packet.submission.id}</p>
        </div>
        <span className="source-label">
          {source === "live" ? "Live Federato data" : "Cached fallback data"}
        </span>
      </div>
      {warning && <p role="alert" className="empty-state">Data notice: {warning}</p>}
      <DecisionPacketView packet={packet} />
      <ReviewerPanel submissionId={packet.submission.id} />
    </>
  );
}
