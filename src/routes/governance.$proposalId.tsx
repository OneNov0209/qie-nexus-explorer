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
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Users, Vote, Calendar } from "lucide-react";
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
  { id: 1, label: "Yes", variant: "success" as const, color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  { id: 2, label: "Abstain", variant: "default" as const, color: "bg-muted/50 border-border/60 text-muted-foreground" },
  { id: 3, label: "No", variant: "danger" as const, color: "bg-red-500/10 border-red-500/30 text-red-400" },
  { id: 4, label: "No With Veto", variant: "warning" as const, color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
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
    <div className="space-y-6 pb-8">
      <Link to="/governance" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-violet-500 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Governance
      </Link>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 ${
              st.variant === "success" ? "bg-emerald-500/10" :
              st.variant === "danger" ? "bg-red-500/10" :
              st.variant === "warning" ? "bg-amber-500/10" :
              "bg-blue-500/10"
            }`}>
              <StatusIcon className={`w-6 h-6 ${
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
                <p className="text-xs text-muted-foreground mt-1 font-mono">{p.content["@type"]}</p>
              )}
            </div>
          </div>
          {p?.status === "PROPOSAL_STATUS_VOTING_PERIOD" && (
            <button onClick={openVote} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all shrink-0">
              <Vote className="w-4 h-4" /> Vote
            </button>
          )}
        </div>
      </Card>

      {/* Params */}
      {params && typeof params === "object" && Object.keys(params).filter(k => k !== "@type").length > 0 && (
        <Card>
          <SectionTitle title="Parameters" icon={<FileText className="w-5 h-5 text-violet-500" />} />
          <div className="space-y-2 mt-2 max-h-96 overflow-y-auto">
            {Object.entries(params)
              .filter(([k]) => k !== "@type")
              .map(([key, value]: any) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-border/30 last:border-0">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider sm:w-40 shrink-0 mt-0.5">{key}</dt>
                  <dd className="text-sm font-mono break-all bg-muted/30 rounded-lg p-2 flex-1 text-xs max-h-32 overflow-y-auto">
                    {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                  </dd>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Tally */}
      <Card>
        <SectionTitle title="Tally" icon={<Users className="w-5 h-5 text-amber-500" />} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {[
            { label: "Yes", value: tally.yes, variant: "success", color: "text-emerald-400" },
            { label: "No", value: tally.no, variant: "danger", color: "text-red-400" },
            { label: "No With Veto", value: tally.no_with_veto, variant: "warning", color: "text-amber-400" },
            { label: "Abstain", value: tally.abstain, variant: "default", color: "text-muted-foreground" },
          ].map((item) => {
            const pct = totalVotes > 0 ? ((Number(item.value ?? 0) / totalVotes) * 100).toFixed(1) : "0";
            return (
              <div key={item.label} className="rounded-xl border border-border/60 bg-card p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{pct}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.value ? formatQIE(item.value, 0) : "—"} {NETWORK.symbol}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <SectionTitle title="Timeline" icon={<Calendar className="w-5 h-5 text-cyan-500" />} />
        <div className="space-y-3 mt-2">
          {p?.submit_time && <TimelineItem label="Submitted at" time={p.submit_time} />}
          {p?.deposit_end_time && <TimelineItem label="Deposited at" time={p.deposit_end_time} />}
          {p?.voting_start_time && <TimelineItem label="Voting start" time={p.voting_start_time} />}
          {p?.voting_end_time && <TimelineItem label="Voting end" time={p.voting_end_time} />}
          <TimelineItem label="Current Status" value={st.label} />
        </div>
      </Card>

      {/* Votes */}
      {votes.length > 0 && (
        <Card>
          <SectionTitle title="Votes" sub={`${votes.length} votes`} icon={<Vote className="w-5 h-5 text-violet-500" />} />
          <div className="space-y-1 mt-2">
            {votes.map((v: any, i: number) => {
              const opt = OPTIONS.find(o => o.id === (v.option === "VOTE_OPTION_YES" ? 1 : v.option === "VOTE_OPTION_ABSTAIN" ? 2 : v.option === "VOTE_OPTION_NO" ? 3 : 4)) || OPTIONS[1];
              return (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="font-mono text-xs text-muted-foreground">{shorten(v.voter, 12, 10)}</span>
                  <Pill variant={opt.variant}>{opt.label}</Pill>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="border-border max-w-md">
          <DialogHeader><DialogTitle>Vote on #{proposalId}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="text-sm font-medium">{title}</div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {OPTIONS.map((o) => (
                <button key={o.id} onClick={() => setOption(o.id as any)}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition border ${option === o.id ? o.color + " border-current" : "border-border/60 hover:bg-muted/30"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModal(null)} className="rounded-xl border border-border/60 px-4 py-2 text-sm hover:bg-muted/30">Cancel</button>
            <button onClick={submit} disabled={busy} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit Vote
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimelineItem({ label, time, value }: { label: string; time?: string; value?: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">
        {time ? <>{dayjs(time).format("YYYY-MM-DD HH:mm")} <span className="text-muted-foreground/50 ml-1">· {dayjs(time).fromNow()}</span></> : value}
      </span>
    </div>
  );
}
