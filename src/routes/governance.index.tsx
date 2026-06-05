import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill, StatCard } from "@/components/ui/primitives";
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import dayjs from "dayjs";

export const Route = createFileRoute("/governance/")({
  head: () => ({ meta: [{ title: "Governance — QIE Explorer" }] }),
  component: GovernanceListPage,
});

const STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger"; icon: any }> = {
  PROPOSAL_STATUS_VOTING_PERIOD: { label: "Voting", variant: "warning", icon: Clock },
  PROPOSAL_STATUS_DEPOSIT_PERIOD: { label: "Deposit", variant: "default", icon: AlertTriangle },
  PROPOSAL_STATUS_PASSED: { label: "Passed", variant: "success", icon: CheckCircle },
  PROPOSAL_STATUS_REJECTED: { label: "Rejected", variant: "danger", icon: XCircle },
  PROPOSAL_STATUS_FAILED: { label: "Failed", variant: "danger", icon: XCircle },
};

function GovernanceListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals"],
    refetchInterval: 60_000,
    queryFn: () => cosmos.proposals(),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const props = (data?.proposals ?? []).sort((a: any, b: any) => Number(b.proposal_id) - Number(a.proposal_id));
  const counts = props.reduce((a: any, p: any) => { a[p.status] = (a[p.status] ?? 0) + 1; return a; }, {});

  return (
    <div className="space-y-6 pb-8">
      <SectionTitle title="Governance" sub="On-chain proposals & voting" icon={<FileText className="w-5 h-5 text-violet-500" />} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Voting" value={counts.PROPOSAL_STATUS_VOTING_PERIOD ?? 0} icon={<Clock className="w-4 h-4 text-amber-400" />} />
        <StatCard label="Passed" value={counts.PROPOSAL_STATUS_PASSED ?? 0} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Rejected" value={counts.PROPOSAL_STATUS_REJECTED ?? 0} icon={<XCircle className="w-4 h-4 text-red-400" />} />
        <StatCard label="Deposit" value={counts.PROPOSAL_STATUS_DEPOSIT_PERIOD ?? 0} icon={<AlertTriangle className="w-4 h-4 text-blue-400" />} />
      </div>

      {/* Proposal List */}
      <div className="space-y-3">
        {props.map((p: any) => {
          const st = STATUS[p.status] ?? { label: p.status, variant: "default" as const, icon: FileText };
          const StatusIcon = st.icon;
          const title = p.content?.title ?? p.title ?? "Untitled Proposal";
          const description = p.content?.description ?? p.summary ?? "";

          return (
            <Link
              key={p.proposal_id}
              to="/governance/$proposalId"
              params={{ proposalId: String(p.proposal_id) }}
              className="block group"
            >
              <Card className="hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                    st.variant === "success" ? "bg-emerald-500/10" :
                    st.variant === "danger" ? "bg-red-500/10" :
                    st.variant === "warning" ? "bg-amber-500/10" :
                    "bg-blue-500/10"
                  }`}>
                    <StatusIcon className={`w-5 h-5 ${
                      st.variant === "success" ? "text-emerald-400" :
                      st.variant === "danger" ? "text-red-400" :
                      st.variant === "warning" ? "text-amber-400" :
                      "text-blue-400"
                    }`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">#{p.proposal_id}</span>
                      <Pill variant={st.variant}>{st.label}</Pill>
                    </div>
                    <h3 className="font-semibold group-hover:text-violet-400 transition-colors">{title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>

                    {/* Voting bar */}
                    {p.status === "PROPOSAL_STATUS_VOTING_PERIOD" && p.final_tally_result && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          {Number(p.final_tally_result.yes ?? 0) > 0 && (
                            <div className="h-full bg-emerald-500 float-left" style={{ width: `${(Number(p.final_tally_result.yes) / (Number(p.final_tally_result.yes) + Number(p.final_tally_result.no) + Number(p.final_tally_result.no_with_veto) + Number(p.final_tally_result.abstain) || 1)) * 100}%` }} />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {p.final_tally_result.yes ? formatQIE(p.final_tally_result.yes, 0) : "0"} Yes
                        </span>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-violet-400 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
                </div>
              </Card>
            </Link>
          );
        })}
        {props.length === 0 && (
          <Card><div className="text-sm text-muted-foreground text-center py-12">No proposals yet.</div></Card>
        )}
      </div>
    </div>
  );
}
