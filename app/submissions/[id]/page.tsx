import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionPacketView } from "@/components/decision-packet";
import { getDemoDecisionPacket } from "@/lib/cache/demo-snapshot";

export default async function SubmissionPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const packet = getDemoDecisionPacket(id);
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
          {packet.analysis.source === "cached" ? "Cached demo data" : "Live data"}
        </span>
      </div>
      <DecisionPacketView packet={packet} />
    </>
  );
}
