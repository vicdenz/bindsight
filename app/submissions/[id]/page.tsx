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
  const cohort = packet.screening.status === "renewal"
    ? { href: "/#renewals", label: "renewals" }
    : packet.screening.status === "unsupported_line"
      ? { href: "/#unsupported-lines", label: "other lines" }
      : { href: "/#candidates", label: "new property candidates" };

  return (
    <>
      <p><Link href={cohort.href}>← Back to {cohort.label}</Link></p>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Decision Packet</p>
          <h1>{packet.submission.accountName}</h1>
          <p>Submission {packet.submission.id} · {packet.submission.submissionType ?? "Unknown type"} · {packet.submission.lineOfBusiness ?? "Unknown line"}</p>
        </div>
        <span className="source-label">
          {source === "live" && packet.analysis.mode === "retrospective" ? "Retrospective Federato assessment" : source === "live" ? "Live Federato data" : "Cached fallback data"}
        </span>
      </div>
      {warning && <p role="alert" className="empty-state">Data notice: {warning}</p>}
      <DecisionPacketView packet={packet} />
      <ReviewerPanel submissionId={packet.submission.id} />
    </>
  );
}
