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
      <p className="back-link"><Link href={cohort.href}>Back to {cohort.label}</Link></p>
      <div className="page-heading">
        <div>
          <p className="page-kicker">Decision packet</p>
          <h1>{packet.submission.accountName}</h1>
          <p className="page-deck">Submission {packet.submission.id} / {packet.submission.submissionType ?? "Unknown type"} / {packet.submission.lineOfBusiness ?? "Unknown line"}</p>
        </div>
        <div className="source-ticket">
          <span className="source-label">
            {source === "live" && packet.analysis.mode === "retrospective" ? "Retrospective Federato assessment" : source === "live" ? "Live Federato data" : "Cached fallback data"}
          </span>
          <small>Evidence-backed assessment</small>
        </div>
      </div>
      {warning && <p role="alert" className="notice notice-warning"><strong>Data notice</strong>{warning}</p>}
      <DecisionPacketView packet={packet} />
      <ReviewerPanel submissionId={packet.submission.id} />
    </>
  );
}
