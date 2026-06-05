import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { toast } from "sonner";
import { useWallet } from "@/lib/wallet";
import { voteProposal } from "@/lib/wallet-tx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Users, Vote, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export const Route = createFileRoute("/governance/$proposalId")({
  head: ({ params }) => ({ meta: [{ title: `Proposal #${params.proposalId} — QIE Explorer` }] }),
  component: ProposalDetail,
});

const STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger"; icon: any }> = {
  PROPOSAL_STATUS_VOTING_PERIOD: { label: "Voting", variant: "warning", icon: Clock },
  PROPOSAL_STATUS_DEPOSIT_PERIOD: { label: "Deposit", variant: "default", icon: AlertTriangle },
  PROPOSAL_STATUS_PASSED: { label: "Passed", variant: "success", icon: CheckCircle },
  PROPOSAL_STATUS_REJECTED: { label: "Rejected", variant: "danger", icon: XCircle },
  PROPOSAL_STATUS_FAILED: { label: "Failed", variant: "danger", icon: XCircle },
};

const OPTIONS = [
  { id: 1, label: "Yes", variant: "success" as const, color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" },
  { id: 2, label: "Abstain", variant: "default" as const, color: "bg-muted/50 border-border/60 text-muted-foreground hover:bg-muted" },
  { id: 3, label: "No", variant: "danger" as const, color: "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" },
  { id: 4, label: "No With Veto", variant: "warning" as const, color: "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" },
];

function getProposalTitle(content: any): string {
  if (!content) return "Untitled Proposal";
  const type = content["@type"] || "";
  if (type.includes("MsgUpdateParams")) return "Update Params";
  if (type.includes("MsgSoftwareUpgrade")) return "Software Upgrade";
  if (type.includes("MsgCancelUpgrade")) return "Cancel Upgrade";
  if (type.includes("CommunityPoolSpend")) return "Community Pool Spend";
  if (type.includes("ParameterChange")) return "Parameter Change";
  if (type.includes("Text")) return "Text Proposal";
  const parts = type.split(".");
  return parts[parts.length - 1] || "Untitled Proposal";
}

function ProposalDetail() {
  const { proposalId } = Route.useParams();
  const { cosmos: w } = useWallet();
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [option, setOption] = useState<1 | 2 | 3 | 4>(1);
  const [busy, setBusy] = useState(false);
  const [showAllParams, setShowAllParams] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["proposal", proposalId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const proposals = await cosmos.proposals();
      const p = proposals?.proposals?.find((x: any) => String(x.proposal_id) === proposalId);
      if (!p) throw new Error("Proposal not found");

      let votes: any[] = [];
      try {
        const votesRes = await fetch(
          `${NETWORK.rest}/cosmos/gov/v1beta1/proposals/${proposalId}/votes?pagination.limit=100`
        ).then(r => r.json());
        votes = votesRes?.votes ?? [];
      } catch {}

      let tally = p.final_tally_result;
      try {
        const tallyRes = await fetch(
          `${NETWORK.rest}/cosmos/gov/v1beta1/proposals/${proposalId}/tally`
        ).then(r => r.json());
        if (tallyRes?.tally) tally = tallyRes.tally;
      } catch {}

      return { proposal: p, votes, tally };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const p = data?.proposal;
  const votes = data?.votes ?? [];
  const tally = data?.tally ?? {};
  const st = STATUS[p?.status] ?? { label: p?.status ?? "Unknown", variant: "default" as const, icon: FileText };
  const StatusIcon = st.icon;
  const title = getProposalTitle(p?.content);
  const params = p?.content;
  const totalVotes = Number(tally.yes ?? 0) + Number(tally.no ?? 0) + Number(tally.no_with_veto ?? 0) + Number(tally.abstain ?? 0);

  const paramEntries = params && typeof params === "object" ? Object.entries(params).filter(([k]) => k !== "@type") : [];
  const visibleParams = showAllParams ? paramEntries : paramEntries.slice(0, 3);

  function openVote() {
    if (!w.address) return toast.error("Connect a Cosmos wallet first");
    setModal(true);
    setOption(1);
  }

  async function submit() {
    if (!modal) return;
    setBusy(true);
    try {
      const res = await voteProposal(proposalId, option);
      toast.success("Vote submitted", { description: `Tx: ${shorten(res.transactionHash, 10, 8)}` });
      setModal(null);
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
    } catch (e: any) {
      toast.error("Vote failed", { description: e?.message ?? String(e) });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Back */}
      <Link to="/governance" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-violet-500 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Governance
      </Link>

      {/* Header Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${
              st.variant === "success" ? "bg-emerald-500/10" :
              st.variant === "danger" ? "bg-red-500/10" :
              st.variant === "warning" ? "bg-amber-500/10" :
              "bg-blue-500/10"
            }`}>
              <StatusIcon className={`w-7 h-7 ${
                st.variant === "success" ? "text-emerald-400" :
                st.variant === "danger" ? "text-red-400" :
                st.variant === "warning" ? "text-amber-400" :
                "text-blue-400"
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground font-mono">#{p?.proposal_id}</span>
                <Pill variant={st.variant}>{st.label}</Pill>
              </div>
              <h1 className="text-xl font-bold">{title}</h1>
              {p?.content?.["@type"] && (
                <p className="text-[11px] text-muted-foreground/60 mt-1 font-mono">{p.content["@type"]}</p>
              )}
            </div>
          </div>
          {p?.status === "PROPOSAL_STATUS_VOTING_PERIOD" && (
            <button onClick={openVote} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-6 py-3 text-sm font-bold flex items-center gap-2 hover:shadow-xl hover:shadow-violet-500/25 transition-all shrink-0">
              <Vote className="w-4 h-4" /> Vote Now
            </button>
          )}
        </div>
      </Card>

      {/* Tally + Timeline in 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tally */}
        <Card className="lg:col-span-2">
          <SectionTitle title="Tally Results" sub={`Total votes: ${formatQIE(totalVotes, 0)} ${NETWORK.symbol}`} icon={<Users className="w-5 h-5 text-amber-400" />} />
          <div className="space-y-3 mt-2">
            {[
              { label: "Yes", value: tally.yes, color: "bg-emerald-500", textColor: "text-emerald-400", icon: CheckCircle },
              { label: "No", value: tally.no, color: "bg-red-500", textColor: "text-red-400", icon: XCircle },
              { label: "No With Veto", value: tally.no_with_veto, color: "bg-amber-500", textColor: "text-amber-400", icon: AlertTriangle },
              { label: "Abstain", value: tally.abstain, color: "bg-muted-foreground/30", textColor: "text-muted-foreground", icon: Clock },
            ].map((item) => {
              const val = Number(item.value ?? 0);
              const pct = totalVotes > 0 ? ((val / totalVotes) * 100).toFixed(1) : "0";
              const Icon = item.icon;
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${item.textColor}`} />
                      {item.label}
                    </span>
                    <span className="text-sm tabular-nums">
                      <span className={item.textColor + " font-bold"}>{pct}%</span>
                      <span className="text-muted-foreground ml-2">{formatQIE(item.value, 0)}</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-700`}
                      style={{ width: `${Math.min(Number(pct), 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Timeline */}
        <Card>
          <SectionTitle title="Timeline" icon={<Calendar className="w-5 h-5 text-cyan-400" />} />
          <div className="space-y-1 mt-2">
            {p?.submit_time && (
              <TimelineItem label="Submitted" time={p.submit_time} dot="bg-blue-400" />
            )}
            {p?.deposit_end_time && (
              <TimelineItem label="Deposit End" time={p.deposit_end_time} dot="bg-amber-400" />
            )}
            {p?.voting_start_time && (
              <TimelineItem label="Voting Start" time={p.voting_start_time} dot="bg-violet-400" />
            )}
            {p?.voting_end_time && (
              <TimelineItem label="Voting End" time={p.voting_end_time} dot="bg-red-400" />
            )}
            <div className="flex items-center gap-3 pl-2.5 py-2.5">
              <span className={`w-2 h-2 rounded-full ${st.variant === "success" ? "bg-emerald-400" : st.variant === "danger" ? "bg-red-400" : "bg-amber-400"}`} />
              <span className="text-xs text-muted-foreground">Status</span>
              <span className="text-xs font-bold ml-auto">{st.label}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Parameters */}
      {paramEntries.length > 0 && (
        <Card>
          <SectionTitle title="Parameters" sub={`${paramEntries.length} fields`} icon={<FileText className="w-5 h-5 text-violet-400" />} />
          <div className="space-y-2 mt-2">
            {visibleParams.map(([key, value]: any) => (
              <div key={key} className="rounded-xl border border-border/40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{key}</span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {typeof value === "object" ? (Array.isArray(value) ? `Array[${value.length}]` : "Object") : typeof value}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                    {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                  </pre>
                </div>
              </div>
            ))}
            {paramEntries.length > 3 && (
              <button
                onClick={() => setShowAllParams(!showAllParams)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                {showAllParams ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showAllParams ? "Show less" : `Show all ${paramEntries.length} parameters`}
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Votes */}
      {votes.length > 0 && (
        <Card>
          <SectionTitle title="Votes" sub={`${votes.length} votes cast`} icon={<Vote className="w-5 h-5 text-violet-400" />} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {votes.map((v: any, i: number) => {
              const opt = v.option === "VOTE_OPTION_YES" ? 1 : v.option === "VOTE_OPTION_ABSTAIN" ? 2 : v.option === "VOTE_OPTION_NO" ? 3 : 4;
              const optData = OPTIONS.find(o => o.id === opt) || OPTIONS[1];
              return (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-card hover:border-violet-500/20 transition-colors">
                  <span className="font-mono text-[11px] text-muted-foreground truncate">{shorten(v.voter, 8, 6)}</span>
                  <Pill variant={optData.variant} className="text-[10px]">{optData.label}</Pill>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Vote Dialog */}
      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="border-border max-w-md">
          <DialogHeader><DialogTitle>Vote on Proposal #{proposalId}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="text-sm font-medium">{title}</div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {OPTIONS.map((o) => (
                <button key={o.id} onClick={() => setOption(o.id as any)}
                  className={`rounded-xl px-3 py-3 text-sm font-bold transition border ${option === o.id ? o.color + " border-current" : "border-border/60 hover:bg-muted/30"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModal(null)} className="rounded-xl border border-border/60 px-4 py-2 text-sm hover:bg-muted/30 transition-colors">Cancel</button>
            <button onClick={submit} disabled={busy} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-5 py-2 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit Vote
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimelineItem({ label, time, dot }: { label: string; time: string; dot: string }) {
  return (
    <div className="flex items-center gap-3 pl-2.5 py-2">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium">{dayjs(time).format("MMM DD, YYYY · HH:mm")}</p>
      </div>
      <span className="text-[10px] text-muted-foreground/60 shrink-0">{dayjs(time).fromNow()}</span>
    </div>
  );
}
