import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill, StatCard } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { useWallet } from "@/lib/wallet";
import { delegate, undelegate, redelegate, withdrawAllRewards } from "@/lib/wallet-tx";
import { toast } from "sonner";
import { useState } from "react";
import { ExternalLink, Gift, Loader2, Layers, Coins } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/staking")({
  head: () => ({ meta: [{ title: "Staking — QIE Explorer" }] }),
  component: StakingPage,
});

type Action = "Delegate" | "Redelegate" | "Undelegate";

function StakingPage() {
  const [q, setQ] = useState("");
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
      const [vals, pool, annual] = await Promise.all([
        cosmos.validators(), cosmos.stakingPool(), cosmos.annualProvisions().catch(() => "0"),
      ]);
      return { vals: vals?.validators ?? [], pool, annual };
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
  const apr = bonded ? (Number(data?.annual ?? 0) / bonded) * 100 : 0;

  const list = (data?.vals ?? [])
    .filter((v: any) => !q || v.description?.moniker?.toLowerCase().includes(q.toLowerCase()))
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
    if (!cw.address) return toast.error("Connect a Cosmos wallet first");
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
    if (!cw.address) return toast.error("Connect a Cosmos wallet first");
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
    <div className="space-y-6">
      <SectionTitle title="Validators" sub={`${data?.vals?.length} validators · Network APR ~${apr.toFixed(2)}%`}
        action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="glass rounded-lg px-3 py-1.5 text-xs" />} />

      {cw.address && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Wallet Balance" value={`${formatQIE(balanceQ, 4)} ${NETWORK.symbol}`} icon={<Coins className="w-4 h-4" />} />
          <StatCard label="Total Staked" value={`${formatQIE(totalStaked, 4)} ${NETWORK.symbol}`} sub={`${myDels.length} validators`} icon={<Layers className="w-4 h-4" />} accent />
          <StatCard label="Pending Rewards" value={`${formatQIE(totalReward, 6)} ${NETWORK.symbol}`} icon={<Gift className="w-4 h-4" />} />
          <div className="glass rounded-2xl p-5 flex items-center justify-center">
            <button
              onClick={claimAll}
              disabled={claiming || !validatorsWithRewards.length}
              className="btn-primary rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              Withdraw All Rewards
            </button>
          </div>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border/60">
              <tr>
                <th className="text-left p-4">#</th><th className="text-left p-4">Validator</th>
                <th className="text-right p-4">Voting Power</th><th className="text-right p-4">Commission</th>
                <th className="text-right p-4">APR</th>
                {cw.address && <th className="text-right p-4">My Stake</th>}
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v: any, i: number) => {
                const comm = Number(v.commission?.commission_rates?.rate ?? 0);
                const vp = bonded ? (Number(v.tokens) / bonded) * 100 : 0;
                const vAPR = apr * (1 - comm);
                const bondedOk = v.status === "BOND_STATUS_BONDED";
                const myDel = myDels.find((d) => d.delegation?.validator_address === v.operator_address);
                const myAmt = myDel?.balance?.amount ?? "0";
                return (
                  <tr key={v.operator_address} className="border-b border-border/40 hover:bg-white/5">
                    <td className="p-4 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="p-4">
                      <div className="font-medium">{v.description?.moniker ?? shorten(v.operator_address)}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        {v.description?.website && <a href={v.description.website} target="_blank" rel="noreferrer" className="hover:text-primary inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" />site</a>}
                        <span className="font-mono">{shorten(v.operator_address, 10, 8)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      <div>{formatQIE(v.tokens, 0)} {NETWORK.symbol}</div>
                      <div className="text-[11px] text-muted-foreground">{vp.toFixed(2)}%</div>
                    </td>
                    <td className="p-4 text-right tabular-nums">{(comm * 100).toFixed(2)}%</td>
                    <td className="p-4 text-right tabular-nums text-primary">{vAPR.toFixed(2)}%</td>
                    {cw.address && (
                      <td className="p-4 text-right tabular-nums">
                        {Number(myAmt) > 0 ? <span className="text-foreground">{formatQIE(myAmt, 4)}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                    )}
                    <td className="p-4">{bondedOk ? <Pill variant="success">Active</Pill> : v.jailed ? <Pill variant="danger">Jailed</Pill> : <Pill variant="warning">Inactive</Pill>}</td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openModal("Delegate", v)} className="btn-primary text-xs rounded-md px-2 py-1">Delegate</button>
                        {Number(myAmt) > 0 && (
                          <>
                            <button onClick={() => openModal("Redelegate", v)} className="text-xs rounded-md px-2 py-1 glass hover:bg-white/10">Redelegate</button>
                            <button onClick={() => openModal("Undelegate", v)} className="text-xs rounded-md px-2 py-1 glass hover:bg-white/10">Undelegate</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="glass-strong border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{modal?.type} — {modal?.val?.description?.moniker}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-xs text-muted-foreground">
              Validator: <span className="font-mono">{shorten(modal?.val?.operator_address ?? "", 14, 10)}</span>
            </div>
            {modal?.type === "Redelegate" && (
              <div>
                <label className="text-xs text-muted-foreground">Destination Validator</label>
                <select
                  value={dstVal}
                  onChange={(e) => setDstVal(e.target.value)}
                  className="w-full glass rounded-lg px-3 py-2 text-sm mt-1 bg-background"
                >
                  <option value="">Select validator…</option>
                  {list
                    .filter((v: any) => v.operator_address !== modal.val.operator_address && v.status === "BOND_STATUS_BONDED")
                    .map((v: any) => (
                      <option key={v.operator_address} value={v.operator_address}>{v.description?.moniker}</option>
                    ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground flex justify-between">
                <span>Amount ({NETWORK.symbol})</span>
                {modal?.type === "Delegate" ? (
                  <span>Available: {formatQIE(balanceQ, 4)}</span>
                ) : (
                  <span>Staked: {formatQIE(myDels.find((d) => d.delegation?.validator_address === modal?.val?.operator_address)?.balance?.amount ?? "0", 4)}</span>
                )}
              </label>
              <input
                type="number"
                step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full glass rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModal(null)} className="glass rounded-lg px-4 py-2 text-sm hover:bg-white/10">Cancel</button>
            <button onClick={submit} disabled={busy} className="btn-primary rounded-lg px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm {modal?.type}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
