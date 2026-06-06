import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill, StatCard } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { useWallet } from "@/lib/wallet";
import { ValidatorAvatar } from "@/components/shared/ValidatorAvatar";
import { delegate, undelegate, redelegate, withdrawAllRewards } from "@/lib/wallet-tx";
import { toast } from "sonner";
import { useState } from "react";
import { Gift, Loader2, Layers, Coins, Search, User, AlertTriangle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/staking/")({
  head: () => ({ meta: [{ title: "Staking — QIE Explorer" }] }),
  component: StakingListPage,
});

type Action = "Delegate" | "Redelegate" | "Undelegate";
type FilterType = "all" | "active" | "inactive" | "jailed";

function StakingListPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [modal, setModal] = useState<{ type: Action; val: any } | null>(null);
  const [amount, setAmount] = useState("");
  const [dstVal, setDstVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const { cosmos: cw } = useWallet();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["validators"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [vals, pool] = await Promise.all([cosmos.validators(), cosmos.stakingPool()]);
      return { vals: vals?.validators ?? [], pool };
    },
  });

  const { data: userData } = useQuery({
    queryKey: ["user-staking", cw.address],
    enabled: !!cw.address,
    refetchInterval: 20_000,
    queryFn: async () => {
      const [dels, rewards, bal] = await Promise.all([
        cosmos.delegations(cw.address!).catch(() => ({ delegation_responses: [] })),
        cosmos.rewards(cw.address!).catch(() => ({ rewards: [], total: [] })),
        cosmos.balance(cw.address!).catch(() => ({ balances: [] })),
      ]);
      return { dels, rewards, bal };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const bonded = Number(data?.pool?.bonded_tokens ?? 0);
  const vals = data?.vals ?? [];
  const activeCount = vals.filter((v: any) => v.status === "BOND_STATUS_BONDED").length;
  const jailedCount = vals.filter((v: any) => v.jailed).length;
  const inactiveCount = vals.length - activeCount - jailedCount;

  const list = vals
    .filter((v: any) => {
      if (filter === "active") return v.status === "BOND_STATUS_BONDED";
      if (filter === "inactive") return v.status !== "BOND_STATUS_BONDED" && !v.jailed;
      if (filter === "jailed") return v.jailed;
      return true;
    })
    .filter((v: any) => {
      if (!q) return true;
      const lower = q.toLowerCase();
      return v.description?.moniker?.toLowerCase().includes(lower) || v.operator_address?.toLowerCase().includes(lower);
    })
    .sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens));

  const myDels: any[] = userData?.dels?.delegation_responses ?? [];
  const myRewards: any[] = userData?.rewards?.rewards ?? [];
  const totalReward = userData?.rewards?.total?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";
  const totalStaked = myDels.reduce((a, d) => a + Number(d.balance?.amount ?? 0), 0);
  const balanceQ = userData?.bal?.balances?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";
  const validatorsWithRewards = myRewards
    .filter((r) => Number(r.reward?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? 0) > 0)
    .map((r) => r.validator_address);

  function openModal(type: Action, val: any) {
    if (!cw.address) return toast.error("Connect Keplr wallet first");
    setModal({ type, val });
    setAmount("");
    setDstVal("");
  }

  async function submit() {
    if (!modal) return;
    const { type, val } = modal;
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    if (type === "Redelegate" && !dstVal) return toast.error("Pick destination validator");
    setBusy(true);
    try {
      let res;
      if (type === "Delegate") res = await delegate(val.operator_address, amount);
      else if (type === "Undelegate") res = await undelegate(val.operator_address, amount);
      else res = await redelegate(val.operator_address, dstVal, amount);
      toast.success(`${type} success`, { description: `Tx: ${shorten(res.transactionHash, 10, 8)}` });
      setModal(null);
      qc.invalidateQueries({ queryKey: ["user-staking"] });
      qc.invalidateQueries({ queryKey: ["validators"] });
    } catch (e: any) {
      toast.error(`${type} failed`, { description: e?.message ?? String(e) });
    } finally { setBusy(false); }
  }

  async function claimAll() {
    if (!cw.address) return toast.error("Connect Keplr wallet first");
    if (!validatorsWithRewards.length) return toast.error("No rewards to claim");
    setClaiming(true);
    try {
      const res = await withdrawAllRewards(validatorsWithRewards);
      toast.success("Rewards claimed", { description: `Tx: ${shorten(res.transactionHash, 10, 8)}` });
      qc.invalidateQueries({ queryKey: ["user-staking"] });
    } catch (e: any) {
      toast.error("Claim failed", { description: e?.message ?? String(e) });
    } finally { setClaiming(false); }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1"><CheckCircle className="w-4 h-4" /><span className="text-[11px] uppercase tracking-wider">Active</span></div>
          <p className="text-2xl font-bold">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-1"><Clock className="w-4 h-4" /><span className="text-[11px] uppercase tracking-wider">Inactive</span></div>
          <p className="text-2xl font-bold">{inactiveCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-red-400 mb-1"><AlertTriangle className="w-4 h-4" /><span className="text-[11px] uppercase tracking-wider">Jailed</span></div>
          <p className="text-2xl font-bold">{jailedCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-violet-400 mb-1"><Layers className="w-4 h-4" /><span className="text-[11px] uppercase tracking-wider">Total Bonded</span></div>
          <p className="text-xl font-bold">{formatQIE(bonded, 0)}</p>
        </div>
      </div>

      {/* User Stats */}
      {cw.address && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Wallet Balance" value={`${formatQIE(balanceQ, 4)} ${NETWORK.symbol}`} icon={<Coins className="w-4 h-4" />} />
          <StatCard label="Total Staked" value={`${formatQIE(totalStaked, 4)} ${NETWORK.symbol}`} sub={`${myDels.length} validators`} icon={<Layers className="w-4 h-4" />} />
          <StatCard label="Pending Rewards" value={`${formatQIE(totalReward, 6)} ${NETWORK.symbol}`} icon={<Gift className="w-4 h-4" />} />
          <div className="flex items-center justify-center">
            <button onClick={claimAll} disabled={claiming || !validatorsWithRewards.length}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-5 py-3 text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/25 transition-all">
              {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              Claim All Rewards
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <SectionTitle title="Validators" sub={`${list.length} validators shown`} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by moniker or address…"
              className="w-64 pl-9 pr-3 py-2 rounded-xl border border-border/60 bg-card text-sm focus:border-violet-500/50 focus:outline-none transition-colors" />
          </div>
          <div className="flex items-center gap-1 bg-card border border-border/60 rounded-xl p-1">
            {(["all", "active", "inactive", "jailed"] as FilterType[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-all ${filter === f ? "bg-violet-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Validator Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">#</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Moniker</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Voting Power</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">APR</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Commission</th>
                <th className="text-center p-4 text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v: any, i: number) => {
                const comm = Number(v.commission?.commission_rates?.rate ?? 0);
                const vp = bonded ? (Number(v.tokens) / bonded) * 100 : 0;
                const bondedOk = v.status === "BOND_STATUS_BONDED";
                const myDel = myDels.find((d) => d.delegation?.validator_address === v.operator_address);
                const myAmt = myDel?.balance?.amount ?? "0";

                return (
                  <tr key={v.operator_address} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                    <td className="p-4 text-muted-foreground tabular-nums text-xs">{i + 1}</td>
                    <td className="p-4">
                      <Link to="/staking/$validator" params={{ validator: v.operator_address }} className="flex items-center gap-3 group/link">
                        <ValidatorAvatar identity={v.description?.identity} moniker={v.description?.moniker} />
                        <div>
                          <div className="font-medium group-hover/link:text-violet-400 transition-colors flex items-center gap-1.5">
                            {v.description?.moniker ?? shorten(v.operator_address)}
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-all" />
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{shorten(v.operator_address, 10, 8)}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      <div className="font-medium">{formatQIE(v.tokens, 0)}</div>
                      <div className="text-[11px] text-muted-foreground">{vp.toFixed(2)}%</div>
                    </td>
                    <td className="p-4 text-right tabular-nums text-violet-400 font-medium">{vp > 0 ? (vp * (1 - comm)).toFixed(2) : "—"}%</td>
                    <td className="p-4 text-right tabular-nums">{(comm * 100).toFixed(2)}%</td>
                    <td className="p-4 text-center">
                      {bondedOk ? <Pill variant="success">Active</Pill> : v.jailed ? <Pill variant="danger">Jailed</Pill> : <Pill variant="warning">Inactive</Pill>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openModal("Delegate", v)} className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs rounded-lg px-2.5 py-1.5 transition-colors">Delegate</button>
                        {Number(myAmt) > 0 && (
                          <>
                            <button onClick={() => openModal("Redelegate", v)} className="bg-muted/50 hover:bg-muted text-xs rounded-lg px-2.5 py-1.5 transition-colors">Re-Delegate</button>
                            <button onClick={() => openModal("Undelegate", v)} className="bg-muted/50 hover:bg-muted text-xs rounded-lg px-2.5 py-1.5 transition-colors">Un-Delegate</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No validators found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog */}
      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="border-border max-w-md">
          <DialogHeader><DialogTitle>{modal?.type} — {modal?.val?.description?.moniker}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-xs text-muted-foreground">Validator: <span className="font-mono">{shorten(modal?.val?.operator_address ?? "", 14, 10)}</span></div>
            {modal?.type === "Redelegate" && (
              <div>
                <label className="text-xs text-muted-foreground">Destination Validator</label>
                <select value={dstVal} onChange={(e) => setDstVal(e.target.value)} className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm mt-1">
                  <option value="">Select validator…</option>
                  {list.filter((x: any) => x.operator_address !== modal.val.operator_address && x.status === "BOND_STATUS_BONDED")
                    .map((x: any) => (<option key={x.operator_address} value={x.operator_address}>{x.description?.moniker}</option>))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground flex justify-between">
                <span>Amount ({NETWORK.symbol})</span>
                {modal?.type === "Delegate" ? <span>Available: {formatQIE(balanceQ, 4)}</span>
                  : <span>Staked: {formatQIE(myDels.find((d) => d.delegation?.validator_address === modal?.val?.operator_address)?.balance?.amount ?? "0", 4)}</span>}
              </label>
              <input type="number" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModal(null)} className="rounded-xl border border-border/60 px-4 py-2 text-sm hover:bg-muted/30 transition-colors">Cancel</button>
            <button onClick={submit} disabled={busy} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirm {modal?.type}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
