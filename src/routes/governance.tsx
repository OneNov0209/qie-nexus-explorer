import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill, StatCard } from "@/components/ui/primitives";
import { toast } from "sonner";
import { useWallet } from "@/lib/wallet";
import { voteProposal } from "@/lib/wallet-tx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/governance")({
  head: () => ({ meta: [{ title: "Governance — QIE Explorer" }] }),
  component: GovPage,
});

const STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
  PROPOSAL_STATUS_VOTING_PERIOD: { label: "Voting", variant: "warning" },
  PROPOSAL_STATUS_DEPOSIT_PERIOD: { label: "Deposit", variant: "default" },
  PROPOSAL_STATUS_PASSED: { label: "Passed", variant: "success" },
  PROPOSAL_STATUS_REJECTED: { label: "Rejected", variant: "danger" },
  PROPOSAL_STATUS_FAILED: { label: "Failed", variant: "danger" },
};

const OPTIONS = [
  { id: 1, label: "Yes", variant: "success" as const },
  { id: 2, label: "Abstain", variant: "default" as const },
  { id: 3, label: "No", variant: "danger" as const },
  { id: 4, label: "No With Veto", variant: "warning" as const },
];

function GovPage() {
  const { cosmos: w } = useWallet();
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [option, setOption] = useState<1 | 2 | 3 | 4>(1);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals"], refetchInterval: 60_000, queryFn: () => cosmos.proposals(),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const props = data?.proposals ?? [];
  const counts = props.reduce((a: any, p: any) => { a[p.status] = (a[p.status] ?? 0) + 1; return a; }, {});

  function openVote(p: any) {
    if (!w.address) return toast.error("Connect a Cosmos wallet first");
    setModal(p);
    setOption(1);
  }

  async function submit() {
    if (!modal) return;
    setBusy(true);
    try {
      const res = await voteProposal(modal.proposal_id, option);
      toast.success("Vote submitted", { description: `Tx: ${shorten(res.transactionHash, 10, 8)}` });
      setModal(null);
      qc.invalidateQueries({ queryKey: ["proposals"] });
    } catch (e: any) {
      toast.error("Vote failed", { description: e?.message ?? String(e) });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Governance" sub="On-chain proposals & voting" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Voting" value={counts.PROPOSAL_STATUS_VOTING_PERIOD ?? 0} accent />
        <StatCard label="Passed" value={counts.PROPOSAL_STATUS_PASSED ?? 0} />
        <StatCard label="Rejected" value={counts.PROPOSAL_STATUS_REJECTED ?? 0} />
        <StatCard label="Deposit" value={counts.PROPOSAL_STATUS_DEPOSIT_PERIOD ?? 0} />
      </div>

      <div className="space-y-3">
        {props.map((p: any) => {
          const st = STATUS[p.status] ?? { label: p.status, variant: "default" as const };
          const tally = p.final_tally_result ?? {};
          const total = Object.values(tally).reduce((a: number, v: any) => a + Number(v), 0) || 1;
          return (
            <Card key={p.proposal_id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">#{p.proposal_id}</span>
                    <Pill variant={st.variant}>{st.label}</Pill>
                  </div>
                  <h3 className="font-semibold">{p.content?.title ?? p.title ?? "Untitled"}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.content?.description ?? p.summary ?? ""}</p>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                      ["YES", tally.yes, "success"],
                      ["NO", tally.no, "danger"],
                      ["VETO", tally.no_with_veto, "warning"],
                      ["ABSTAIN", tally.abstain, "default"],
                    ].map(([k, v, variant]: any) => (
                      <div key={k} className="text-center">
                        <Pill variant={variant}>{k}</Pill>
                        <div className="text-xs mt-1 tabular-nums">{((Number(v ?? 0) / total) * 100).toFixed(1)}%</div>
                        <div className="text-[10px] text-muted-foreground">{formatQIE(v, 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {p.status === "PROPOSAL_STATUS_VOTING_PERIOD" && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => openVote(p)} className="btn-primary rounded-lg px-3 py-1.5 text-xs">Vote</button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {props.length === 0 && <Card><div className="text-sm text-muted-foreground text-center py-8">No proposals yet.</div></Card>}
      </div>

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="glass-strong border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Vote on #{modal?.proposal_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="text-sm font-medium">{modal?.content?.title ?? modal?.title}</div>
            <p className="text-xs text-muted-foreground line-clamp-3">{modal?.content?.description ?? modal?.summary}</p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOption(o.id as any)}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition border ${option === o.id ? "bg-primary/20 border-primary text-white" : "glass border-transparent hover:bg-white/10"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModal(null)} className="glass rounded-lg px-4 py-2 text-sm hover:bg-white/10">Cancel</button>
            <button onClick={submit} disabled={busy} className="btn-primary rounded-lg px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Vote
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
