import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten, evmRpc } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { useState, useMemo } from "react";
import { useWallet } from "@/lib/wallet";
import { toast } from "sonner";
import { delegate, undelegate, redelegate, withdrawAllRewards } from "@/lib/wallet-tx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Wallet, Send, Coins, ArrowDownLeft, ArrowUpRight, Layers,
  Copy, Check, TrendingUp, Clock, Gift, FileText,
  BarChart3, LogOut, Loader2
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export const Route = createFileRoute("/address/$address")({
  head: ({ params }) => ({ meta: [{ title: `Address ${shorten(params.address)} — QIE Explorer` }] }),
  component: AddressDetail,
});

const PIE_COLORS = ["#8B5CF6", "#D946EF", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

type Action = "Delegate" | "Redelegate" | "Undelegate";

function AddressDetail() {
  const { address } = Route.useParams();
  const { cosmos: cw, evm: ew } = useWallet() as any;
  const [copied, setCopied] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [modal, setModal] = useState<{ type: Action; val: any } | null>(null);
  const [amount, setAmount] = useState("");
  const [dstVal, setDstVal] = useState("");
  const [busy, setBusy] = useState(false);
  const isOwn = cw?.address === address || ew?.address === address;
  const isEvmAddr = address.startsWith("0x");
  const isValidator = address.startsWith("qievaloper");

  // Balance
  const { data: balance } = useQuery({
    queryKey: ["bal", address],
    queryFn: () => cosmos.balance(address).catch(() => ({ balances: [] })),
    refetchInterval: 30_000,
  });

  // Delegations
  const { data: dels } = useQuery({
    queryKey: ["dels", address],
    queryFn: () => cosmos.delegations(address).catch(() => ({ delegation_responses: [] })),
    refetchInterval: 30_000,
  });

  // Rewards
  const { data: rewards } = useQuery({
    queryKey: ["rewards", address],
    queryFn: () => cosmos.rewards(address).catch(() => ({ rewards: [], total: [] })),
    refetchInterval: 30_000,
  });

  // Unbonding
  const { data: unb } = useQuery({
    queryKey: ["unb", address],
    queryFn: () => cosmos.unbonding(address).catch(() => ({ unbonding_responses: [] })),
    refetchInterval: 30_000,
  });

  // EVM data
  const { data: evmData } = useQuery({
    queryKey: ["evm-addr", address],
    enabled: isEvmAddr,
    queryFn: async () => {
      const [bal, txCount, code] = await Promise.all([
        evmRpc<string>("eth_getBalance", [address, "latest"]),
        evmRpc<string>("eth_getTransactionCount", [address, "latest"]),
        evmRpc<string>("eth_getCode", [address, "latest"]),
      ]);
      return {
        balance: bal ? (Number(BigInt(bal)) / 1e18).toFixed(6) : "0",
        txCount: txCount ? parseInt(txCount, 16) : 0,
        isContract: code !== "0x",
      };
    },
  });

  // Recent transactions via Tendermint tx_search
  const { data: txData } = useQuery({
    queryKey: ["tx-search", address],
    queryFn: async () => {
      try {
        const encoded = encodeURIComponent(address);
        const [sent, recv] = await Promise.all([
          fetch(`/api/rpc/tx_search?query=%22message.sender=%27${encoded}%27%22&per_page=25&order_by=%22desc%22`).then(r => r.json()).catch(() => ({ result: { txs: [] } })),
          fetch(`/api/rpc/tx_search?query=%22transfer.recipient=%27${encoded}%27%22&per_page=25&order_by=%22desc%22`).then(r => r.json()).catch(() => ({ result: { txs: [] } })),
        ]);
        const all = [
          ...(sent?.result?.txs ?? []).map((t: any) => ({ ...t, _dir: "out" as const })),
          ...(recv?.result?.txs ?? []).map((t: any) => ({ ...t, _dir: "in" as const })),
        ];
        const seen = new Set<string>();
        const dedup = all.filter(t => { if (seen.has(t.hash)) return false; seen.add(t.hash); return true; });
        dedup.sort((a, b) => Number(b.height) - Number(a.height));
        return dedup.slice(0, 30);
      } catch { return []; }
    },
    refetchInterval: 30_000,
    enabled: !isEvmAddr,
  });

  // EVM recent transactions
  const { data: evmTxs } = useQuery({
    queryKey: ["evm-txs", address],
    queryFn: async () => {
      try {
        const latestBlock = await evmRpc<string>("eth_blockNumber", []);
        const latest = parseInt(latestBlock, 16);
        const txPromises = [];
        for (let i = 0; i < Math.min(20, latest); i++) {
          txPromises.push(evmRpc<any>("eth_getBlockByNumber", ["0x" + (latest - i).toString(16), true]).catch(() => null));
        }
        const blocks = await Promise.all(txPromises);
        const txs: any[] = [];
        for (const block of blocks) {
          if (!block?.transactions) continue;
          for (const tx of block.transactions) {
            if (tx.from?.toLowerCase() === address.toLowerCase() || tx.to?.toLowerCase() === address.toLowerCase()) {
              txs.push({ hash: tx.hash, blockNumber: parseInt(block.number, 16), time: parseInt(block.timestamp, 16) * 1000, from: tx.from, to: tx.to, value: Number(BigInt(tx.value)) / 1e18, type: tx.from?.toLowerCase() === address.toLowerCase() ? "out" : "in" });
            }
            if (txs.length >= 30) break;
          }
          if (txs.length >= 30) break;
        }
        return txs;
      } catch { return []; }
    },
    refetchInterval: 30_000,
    enabled: isEvmAddr,
  });

  const available = Number(balance?.balances?.find((b: any) => b.denom === NETWORK.denom)?.amount ?? 0);
  const delegations = dels?.delegation_responses ?? [];
  const delegated = delegations.reduce((s: number, d: any) => s + Number(d.balance?.amount ?? 0), 0);
  const totalRewards = Number(rewards?.total?.find((t: any) => t.denom === NETWORK.denom)?.amount ?? 0);
  const unbonding = (unb?.unbonding_responses ?? []).reduce((s: number, u: any) => s + (u.entries ?? []).reduce((ss: number, e: any) => ss + Number(e.balance ?? 0), 0), 0);

  const valQueries = useQueries({
    queries: delegations.map((d: any) => ({
      queryKey: ["val-meta", d.delegation.validator_address],
      queryFn: () => cosmos.validatorByAddr(d.delegation.validator_address).catch(() => null),
      staleTime: 5 * 60_000,
    })),
  });

  const enrichedDels = useMemo(() =>
    delegations.map((d: any, i: number) => {
      const v = (valQueries[i]?.data as any);
      return { valoper: d.delegation.validator_address, amount: Number(d.balance?.amount ?? 0), moniker: v?.description?.moniker, identity: v?.description?.identity, jailed: v?.jailed, status: v?.status };
    }), [delegations, valQueries]);

  const totalPortfolio = available + delegated + unbonding + totalRewards;
  const pieData = [
    { name: "Available", value: available },
    { name: "Delegated", value: delegated },
    { name: "Unbonding", value: unbonding },
    { name: "Rewards", value: totalRewards },
  ].filter(d => d.value > 0);

  const delChart = enrichedDels.slice().sort((a, b) => b.amount - a.amount).slice(0, 10).map(d => ({ name: d.moniker || shorten(d.valoper, 6, 4), amount: d.amount / 1e18 }));

  const validatorsWithRewards = (rewards?.rewards ?? []).filter((r: any) => Number(r.reward?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? 0) > 0).map((r: any) => r.validator_address);

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
      if (type === "Delegate") res = await delegate(val.valoper, amount);
      else if (type === "Undelegate") res = await undelegate(val.valoper, amount);
      else res = await redelegate(val.valoper, dstVal, amount);
      toast.success(`${type} success`, { description: `Tx: ${shorten(res.transactionHash, 10, 8)}` });
      setModal(null);
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
    } catch (e: any) {
      toast.error("Claim failed", { description: e?.message ?? String(e) });
    } finally { setClaiming(false); }
  }

  function copy(val: string) { navigator.clipboard.writeText(val); setCopied(val); setTimeout(() => setCopied(null), 1500); }

  const isLoading = !balance && !dels;
  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6 pb-8">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`h-14 w-14 rounded-2xl grid place-items-center shrink-0 ring-2 ${evmData?.isContract ? "bg-cyan-500/10 ring-cyan-500/30 text-cyan-400" : isValidator ? "bg-violet-500/10 ring-violet-500/30 text-violet-400" : "bg-blue-500/10 ring-blue-500/30 text-blue-400"}`}>
            {evmData?.isContract ? <FileText className="h-6 w-6" /> : isValidator ? <Layers className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{evmData?.isContract ? "Contract" : isValidator ? "Validator Operator" : "Account"}</div>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-base sm:text-lg font-mono break-all">{address}</h1>
              <button onClick={() => copy(address)} className="text-muted-foreground hover:text-violet-400 transition-colors">{copied === address ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}</button>
            </div>
            {isValidator && <Link to="/staking/$validator" params={{ validator: address }} className="text-xs text-primary hover:underline mt-2 inline-block">View validator profile →</Link>}
          </div>
          {/* Action buttons for own address */}
          {isOwn && cw.address && (
            <div className="flex flex-wrap gap-2">
              <button onClick={claimAll} disabled={claiming || !validatorsWithRewards.length}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/25 transition-all">
                {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                Claim All Rewards
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Available" value={formatQIE(available, 2)} sub={NETWORK.symbol} />
        <Stat label="Delegated" value={formatQIE(delegated, 2)} sub={NETWORK.symbol} />
        <Stat label="Unbonding" value={formatQIE(unbonding, 2)} sub={NETWORK.symbol} />
        <Stat label="Rewards" value={formatQIE(totalRewards, 4)} sub={NETWORK.symbol} />
      </div>

      {isEvmAddr && evmData && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="EVM Balance" value={`${evmData.balance} ${NETWORK.symbol}`} />
          <Stat label="TX Count" value={evmData.txCount.toLocaleString()} />
          <Stat label="Type" value={evmData.isContract ? "Contract" : "EOA"} />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Portfolio Breakdown</h2><span className="text-xs font-mono text-muted-foreground">{formatQIE(totalPortfolio, 2)} {NETWORK.symbol}</span></div>
          <div className="h-64">
            {pieData.length === 0 ? <div className="h-full grid place-items-center text-sm text-muted-foreground">No assets yet</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}</Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => formatQIE(Number(v), 2)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Top Delegations</h2><span className="text-xs text-muted-foreground">{enrichedDels.length} total</span></div>
          <div className="h-64">
            {delChart.length === 0 ? <div className="h-full grid place-items-center text-sm text-muted-foreground">No delegations</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={delChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => `${Number(v).toLocaleString()} ${NETWORK.symbol}`} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>{delChart.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Delegations List with Action Buttons */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold inline-flex items-center gap-2"><Layers className="h-4 w-4 text-violet-400" /> Delegations</h2>
          <span className="text-xs text-muted-foreground">{enrichedDels.length}</span>
        </div>
        <div className="divide-y divide-border">
          {enrichedDels.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No delegations</div>
          ) : (
            enrichedDels.map((d) => (
              <div key={d.valoper} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition gap-3 flex-wrap">
                <Link to="/staking/$validator" params={{ validator: d.valoper }} className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center shrink-0 text-xs font-bold">{d.moniker?.slice(0, 2).toUpperCase() || "??"}</div>
                  <div className="min-w-0">
                    <div className="font-medium truncate text-sm">{d.moniker || shorten(d.valoper, 10, 6)}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">{shorten(d.valoper, 14, 8)}</div>
                  </div>
                  {d.jailed && <Pill variant="danger">Jailed</Pill>}
                </Link>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-mono text-xs font-medium">{formatQIE(d.amount, 2)}</div>
                    <div className="text-[10px] text-muted-foreground">{delegated > 0 ? ((d.amount / delegated) * 100).toFixed(2) : 0}%</div>
                  </div>
                  {isOwn && cw.address && (
                    <div className="flex gap-1">
                      <button onClick={() => openModal("Delegate", d)} className="text-[10px] bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg px-2 py-1 transition-colors">Del</button>
                      <button onClick={() => openModal("Redelegate", d)} className="text-[10px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg px-2 py-1 transition-colors">Re-Del</button>
                      <button onClick={() => openModal("Undelegate", d)} className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg px-2 py-1 transition-colors">Un-Del</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Rewards */}
      {rewards?.rewards?.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold inline-flex items-center gap-2"><Gift className="h-4 w-4 text-pink-400" /> Rewards</h2><span className="text-xs font-mono text-pink-400">{formatQIE(totalRewards, 6)} {NETWORK.symbol}</span></div>
          <div className="divide-y divide-border">
            {rewards.rewards.filter((r: any) => Number(r.reward?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? 0) > 0).map((r: any, i: number) => {
              const qie = r.reward?.find((c: any) => c.denom === NETWORK.denom);
              return (
                <Link key={i} to="/staking/$validator" params={{ validator: r.validator_address }} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition">
                  <span className="font-mono text-xs text-muted-foreground">{shorten(r.validator_address, 14, 10)}</span>
                  <span className="text-sm font-medium text-pink-400">{formatQIE(qie?.amount ?? "0", 6)} {NETWORK.symbol}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Unbonding */}
      {unb?.unbonding_responses?.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold inline-flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /> Unbonding</h2></div>
          <div className="divide-y divide-border">
            {unb.unbonding_responses.map((u: any, i: number) => (
              <div key={i} className="px-5 py-3"><p className="text-xs font-mono text-muted-foreground mb-2">{shorten(u.validator_address, 14, 10)}</p>
                {u.entries?.map((e: any, j: number) => (<div key={j} className="flex items-center justify-between text-sm"><span>{formatQIE(e.balance ?? "0", 4)} {NETWORK.symbol}</span><span className="text-xs text-muted-foreground">Completes {new Date(e.completion_time).toLocaleDateString()}</span></div>))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Transactions - Cosmos */}
      {txData && txData.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold">Recent Transactions</h2><span className="text-xs text-muted-foreground">{txData.length}</span></div>
          <div className="divide-y divide-border">
            {txData.map((t: any) => {
              const events = t.tx_result?.events ?? [];
              const msgEvent = events.find((e: any) => e.type === "message" && e.attributes?.find((a: any) => a.key === "action"));
              const action = msgEvent?.attributes?.find((a: any) => a.key === "action")?.value ?? "Tx";
              const msgType = action.split(".").pop()?.replace("Msg", "") ?? action;
              const success = t.tx_result?.code === 0 || t.tx_result?.code === undefined;
              const fee = events.find((e: any) => e.type === "tx")?.attributes?.find((a: any) => a.key === "fee")?.value;
              const dir = t._dir;
              return (
                <Link key={t.hash} to="/tx/$hash" params={{ hash: t.hash }} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/30 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${dir === "in" ? "bg-emerald-500/10 text-emerald-400" : "bg-violet-500/10 text-violet-400"}`}>{dir === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</div>
                    <div className="min-w-0"><div className="text-sm font-medium flex items-center gap-2"><span>{msgType}</span>{!success && <Pill variant="danger">Failed</Pill>}</div><div className="text-[11px] text-muted-foreground font-mono truncate">{shorten(t.hash, 10, 8)}</div></div>
                  </div>
                  <div className="text-right shrink-0"><div className="text-xs font-mono">#{Number(t.height).toLocaleString()}</div>{fee && <div className="text-[10px] text-muted-foreground">{formatQIE(fee.replace("aqie", ""), 4)} {NETWORK.symbol}</div>}</div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent Transactions - EVM */}
      {evmTxs && evmTxs.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold">Recent EVM Transactions</h2><span className="text-xs text-muted-foreground">{evmTxs.length}</span></div>
          <div className="divide-y divide-border">
            {evmTxs.map((tx: any, i: number) => (
              <Link key={i} to="/tx/$hash" params={{ hash: tx.hash }} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/30 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${tx.type === "in" ? "bg-emerald-500/10 text-emerald-400" : "bg-violet-500/10 text-violet-400"}`}>{tx.type === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</div>
                  <div className="min-w-0"><div className="text-sm font-medium">{tx.type === "in" ? "Receive" : "Send"}</div><div className="text-[11px] text-muted-foreground font-mono truncate">{shorten(tx.hash, 10, 8)}</div></div>
                </div>
                <div className="text-right shrink-0"><div className="text-xs font-mono">#{tx.blockNumber.toLocaleString()}</div><div className="text-[10px] text-muted-foreground">{tx.value.toFixed(4)} {NETWORK.symbol}</div></div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="border-border max-w-md">
          <DialogHeader><DialogTitle>{modal?.type} — {modal?.val?.moniker || shorten(modal?.val?.valoper, 10, 6)}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-xs text-muted-foreground">Validator: <span className="font-mono">{shorten(modal?.val?.valoper ?? "", 14, 10)}</span></div>
            {modal?.type === "Redelegate" && (
              <div>
                <label className="text-xs text-muted-foreground">Destination Validator</label>
                <select value={dstVal} onChange={(e) => setDstVal(e.target.value)} className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm mt-1">
                  <option value="">Select validator…</option>
                  {enrichedDels.filter((x: any) => x.valoper !== modal.val.valoper).map((x: any) => (<option key={x.valoper} value={x.valoper}>{x.moniker || shorten(x.valoper, 10, 6)}</option>))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground flex justify-between">
                <span>Amount ({NETWORK.symbol})</span>
                {modal?.type === "Delegate" ? <span>Available: {formatQIE(available, 4)}</span> : <span>Staked: {formatQIE(modal?.val?.amount ?? 0, 4)}</span>}
              </label>
              <input type="number" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm mt-1" />
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1 font-mono tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
