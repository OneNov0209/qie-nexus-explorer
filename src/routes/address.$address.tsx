import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten, evmRpc } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { useState } from "react";
import {
  ArrowLeft, User, Wallet, Coins, Layers, Gift, Clock,
  FileText, Key, ExternalLink, Copy, Check, Activity,
  ArrowRightLeft, Database, Vote, History, TrendingUp,
  BarChart3, ChevronRight
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export const Route = createFileRoute("/address/$address")({
  head: ({ params }) => ({ meta: [{ title: `Address ${shorten(params.address)} — QIE Explorer` }] }),
  component: AddressDetail,
});

const PIE_COLORS = ["#8B5CF6", "#D946EF", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

function AddressDetail() {
  const { address } = Route.useParams();
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["address-detail", address],
    refetchInterval: 15_000,
    queryFn: async () => {
      const isEvm = address.startsWith("0x");
      const isCosmos = address.startsWith("qie") || address.startsWith("qievaloper");
      const isValidator = address.startsWith("qievaloper");

      let accountInfo: any = null;
      let balance: any[] = [];
      let delegations: any[] = [];
      let rewards: any = null;
      let evmBalance: string = "0";
      let evmTxCount: number = 0;
      let isContract: boolean = false;
      let validatorInfo: any = null;
      let validatorDelegations: any[] = [];
      let txHistory: any[] = [];
      let unbonding: any[] = [];

      // Fetch Cosmos data
      if (isCosmos || isValidator) {
        try {
          const [acc, bal, dels, rews, unbond] = await Promise.all([
            fetch(`${NETWORK.rest}/cosmos/auth/v1beta1/accounts/${address}`).then(r => r.json()).catch(() => null),
            fetch(`${NETWORK.rest}/cosmos/bank/v1beta1/balances/${address}`).then(r => r.json()).catch(() => ({ balances: [] })),
            fetch(`${NETWORK.rest}/cosmos/staking/v1beta1/delegations/${address}`).then(r => r.json()).catch(() => ({ delegation_responses: [] })),
            fetch(`${NETWORK.rest}/cosmos/distribution/v1beta1/delegators/${address}/rewards`).then(r => r.json()).catch(() => null),
            fetch(`${NETWORK.rest}/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`).then(r => r.json()).catch(() => ({ unbonding_responses: [] })),
          ]);
          accountInfo = acc?.account;
          balance = bal?.balances ?? [];
          delegations = dels?.delegation_responses ?? [];
          rewards = rews;
          unbonding = unbond?.unbonding_responses ?? [];
        } catch {}
      }

      // Fetch validator info
      if (isValidator) {
        try {
          const [v, vdels] = await Promise.all([
            cosmos.validatorByAddr(address).catch(() => null),
            fetch(`${NETWORK.rest}/cosmos/staking/v1beta1/validators/${address}/delegations?pagination.limit=50`).then(r => r.json()).catch(() => ({ delegation_responses: [] })),
          ]);
          validatorInfo = v;
          validatorDelegations = vdels?.delegation_responses ?? [];
        } catch {}
      }

      // Fetch EVM data
      if (isEvm) {
        try {
          const [bal, txCount, code] = await Promise.all([
            evmRpc<string>("eth_getBalance", [address, "latest"]),
            evmRpc<string>("eth_getTransactionCount", [address, "latest"]),
            evmRpc<string>("eth_getCode", [address, "latest"]),
          ]);
          evmBalance = bal ? (Number(BigInt(bal)) / 1e18).toFixed(6) : "0";
          evmTxCount = txCount ? parseInt(txCount, 16) : 0;
          isContract = code !== "0x";
        } catch {}
      }

      // Also fetch Cosmos balance for EVM addresses (ethermint)
      if (isEvm) {
        try {
          const [bal, dels] = await Promise.all([
            fetch(`${NETWORK.rest}/cosmos/bank/v1beta1/balances/${address}`).then(r => r.json()).catch(() => ({ balances: [] })),
            fetch(`${NETWORK.rest}/cosmos/staking/v1beta1/delegations/${address}`).then(r => r.json()).catch(() => ({ delegation_responses: [] })),
          ]);
          if (bal?.balances?.length) balance = bal.balances;
          if (dels?.delegation_responses?.length) delegations = dels.delegation_responses;
        } catch {}
      }

      // Fetch recent TXs from EVM
      if (isEvm && evmTxCount > 0) {
        try {
          const latestBlock = await evmRpc<string>("eth_blockNumber", []);
          const latest = parseInt(latestBlock, 16);
          const txPromises = [];
          for (let i = 0; i < Math.min(10, latest); i++) {
            txPromises.push(
              evmRpc<any>("eth_getBlockByNumber", ["0x" + (latest - i).toString(16), true]).catch(() => null)
            );
          }
          const blocks = await Promise.all(txPromises);
          for (const block of blocks) {
            if (!block?.transactions) continue;
            for (const tx of block.transactions) {
              if (tx.from?.toLowerCase() === address.toLowerCase() || tx.to?.toLowerCase() === address.toLowerCase()) {
                txHistory.push({
                  hash: tx.hash,
                  blockNumber: parseInt(block.number, 16),
                  time: parseInt(block.timestamp, 16) * 1000,
                  from: tx.from,
                  to: tx.to,
                  value: Number(BigInt(tx.value)) / 1e18,
                  type: tx.from?.toLowerCase() === address.toLowerCase() ? "Send" : "Receive",
                });
              }
            }
          }
        } catch {}
      }

      const totalRewards = rewards?.rewards?.reduce((sum: number, r: any) => {
        const qie = r.reward?.find((c: any) => c.denom === NETWORK.denom);
        return sum + Number(qie?.amount ?? 0);
      }, 0) ?? 0;

      return {
        address,
        isEvm,
        isCosmos,
        isValidator,
        isContract,
        accountInfo,
        balance,
        delegations,
        rewards,
        totalRewards,
        evmBalance,
        evmTxCount,
        validatorInfo,
        validatorDelegations,
        txHistory,
        unbonding,
      };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const d = data!;
  const qieBalance = d.balance?.find((b: any) => b.denom === NETWORK.denom)?.amount ?? "0";
  const totalStaked = d.delegations?.reduce((sum: number, del: any) => sum + Number(del.balance?.amount ?? 0), 0) ?? 0;
  const totalUnbonding = d.unbonding?.reduce((sum: number, u: any) => sum + u.entries?.reduce((s: number, e: any) => s + Number(e.balance ?? 0), 0), 0) ?? 0;

  // Pie data for asset distribution
  const assetPie = [
    { name: "Balance", value: Number(qieBalance) / 1e18 },
    { name: "Staked", value: totalStaked / 1e18 },
    { name: "Unbonding", value: totalUnbonding / 1e18 },
    { name: "Rewards", value: (d.totalRewards ?? 0) / 1e18 },
  ].filter(p => p.value > 0);

  const chartData = d.txHistory.slice(0, 20).reverse().map((tx: any) => ({
    time: dayjs(tx.time).format("HH:mm"),
    value: tx.value,
    type: tx.type,
  }));

  function copy(val: string) {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-violet-500 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-full blur-2xl" />
        <div className="relative">
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${
              d.isContract ? "bg-cyan-500/10" : d.isValidator ? "bg-violet-500/10" : "bg-blue-500/10"
            }`}>
              {d.isContract ? <FileText className="w-7 h-7 text-cyan-400" /> :
               d.isValidator ? <Layers className="w-7 h-7 text-violet-400" /> :
               <Wallet className="w-7 h-7 text-blue-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {d.isContract && <Pill variant="default">Contract</Pill>}
                {d.isValidator && <Pill variant="success">Validator</Pill>}
                {!d.isContract && !d.isValidator && <Pill variant="default">Address</Pill>}
              </div>
              <h1 className="text-sm font-bold font-mono break-all">{d.address}</h1>
              <button onClick={() => copy(d.address)} className="text-xs text-muted-foreground hover:text-violet-400 transition-colors mt-1">
                {copied === d.address ? <Check className="w-3 h-3 inline text-emerald-400" /> : <Copy className="w-3 h-3 inline" />}
                {copied === d.address ? " Copied!" : " Copy address"}
              </button>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-border/30">
            {d.isEvm && <MiniStat label="EVM Balance" value={`${d.evmBalance} ${NETWORK.symbol}`} />}
            {Number(qieBalance) > 0 && <MiniStat label="Available" value={`${formatQIE(qieBalance, 2)} ${NETWORK.symbol}`} />}
            {totalStaked > 0 && <MiniStat label="Staked" value={`${formatQIE(totalStaked, 2)} ${NETWORK.symbol}`} />}
            {d.totalRewards > 0 && <MiniStat label="Rewards" value={`${formatQIE(d.totalRewards, 4)} ${NETWORK.symbol}`} />}
            {d.isEvm && <MiniStat label="TX Count" value={d.evmTxCount.toLocaleString()} />}
          </div>
        </div>
      </Card>

      {/* Charts Row */}
      {(assetPie.length > 0 || chartData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Asset Distribution Pie */}
          {assetPie.length > 0 && (
            <Card>
              <SectionTitle title="Asset Distribution" icon={<PieChartIcon className="w-5 h-5 text-violet-400" />} />
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {assetPie.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center pb-2">
                {assetPie.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-[11px] text-muted-foreground">{p.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TX History Chart */}
          {chartData.length > 0 && (
            <Card className="lg:col-span-2">
              <SectionTitle title="Transaction History" sub="Recent activity" icon={<TrendingUp className="w-5 h-5 text-cyan-400" />} />
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fill="url(#valueGrad)" name="Value (QIE)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Account Info */}
      {d.accountInfo && (
        <Card>
          <SectionTitle title="Account Info" icon={<Key className="w-5 h-5 text-violet-400" />} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            <InfoRow label="Account Number" value={d.accountInfo.base_account?.account_number ?? d.accountInfo.account_number ?? "—"} />
            <InfoRow label="Sequence" value={d.accountInfo.base_account?.sequence ?? d.accountInfo.sequence ?? "—"} />
            <InfoRow label="Type" value={d.accountInfo["@type"] || "—"} mono />
            {d.accountInfo.base_account?.pub_key?.key && (
              <InfoRow label="Public Key" value={d.accountInfo.base_account.pub_key.key} mono />
            )}
          </div>
        </Card>
      )}

      {/* Delegations */}
      {d.delegations.length > 0 && (
        <Card>
          <SectionTitle title="Delegations" sub={`${d.delegations.length} validator(s)`} icon={<Layers className="w-5 h-5 text-violet-400" />} />
          <div className="space-y-2 mt-2">
            {d.delegations.map((del: any, i: number) => {
              const valAddr = del.delegation?.validator_address;
              const valMoniker = d.validatorDelegations?.find((v: any) => v.delegation?.validator_address === valAddr);
              // Find validator info from all validators
              const valInfo = d.validatorInfo && d.validatorInfo.operator_address === valAddr ? d.validatorInfo : null;

              return (
                <Link
                  key={i}
                  to="/staking/$validator"
                  params={{ validator: valAddr }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center shrink-0">
                      <Layers className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium group-hover:text-violet-400 transition-colors truncate">
                        {valInfo?.description?.moniker || shorten(valAddr, 10, 8)}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">{shorten(valAddr, 12, 8)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold">{formatQIE(del.balance?.amount ?? "0", 4)}</p>
                    <p className="text-[11px] text-muted-foreground">{NETWORK.symbol}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Unbonding */}
      {d.unbonding.length > 0 && (
        <Card>
          <SectionTitle title="Unbonding" sub={`${d.unbonding.length} entries`} icon={<Clock className="w-5 h-5 text-amber-400" />} />
          <div className="space-y-2 mt-2">
            {d.unbonding.map((u: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-muted/30">
                <p className="text-xs font-mono text-muted-foreground mb-2">{shorten(u.validator_address, 12, 10)}</p>
                {u.entries?.map((e: any, j: number) => (
                  <div key={j} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatQIE(e.balance ?? "0", 4)} {NETWORK.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      Completes {dayjs(e.completion_time).format("MMM DD, YYYY")}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rewards */}
      {d.rewards && d.totalRewards > 0 && (
        <Card>
          <SectionTitle title="Rewards" sub={`Total: ${formatQIE(d.totalRewards, 6)} ${NETWORK.symbol}`} icon={<Gift className="w-5 h-5 text-pink-400" />} />
          <div className="space-y-1 mt-2 max-h-60 overflow-y-auto">
            {d.rewards.rewards?.map((r: any, i: number) => {
              const qie = r.reward?.find((c: any) => c.denom === NETWORK.denom);
              if (!qie || Number(qie.amount) === 0) return null;
              return (
                <Link
                  key={i}
                  to="/staking/$validator"
                  params={{ validator: r.validator_address }}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors"
                >
                  <span className="font-mono text-xs text-muted-foreground">{shorten(r.validator_address, 12, 10)}</span>
                  <span className="text-sm font-medium text-pink-400">{formatQIE(qie.amount, 6)} {NETWORK.symbol}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Transaction History Table */}
      {d.txHistory.length > 0 && (
        <Card>
          <SectionTitle title="Recent Transactions" sub={`${d.txHistory.length} found`} icon={<History className="w-5 h-5 text-cyan-400" />} />
          <div className="space-y-1 mt-2">
            {d.txHistory.slice(0, 10).map((tx: any, i: number) => (
              <Link
                key={i}
                to="/tx/$hash"
                params={{ hash: tx.hash }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                    tx.type === "Send" ? "bg-red-500/10" : "bg-emerald-500/10"
                  }`}>
                    <ArrowRightLeft className={`w-4 h-4 ${tx.type === "Send" ? "text-red-400" : "text-emerald-400"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono truncate group-hover:text-violet-400 transition-colors">
                      {shorten(tx.hash, 8, 6)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tx.type} · Block #{tx.blockNumber.toLocaleString()} · {dayjs(tx.time).format("HH:mm:ss")}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium shrink-0 ml-3">
                  {tx.value.toFixed(4)} {NETWORK.symbol}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Balances */}
      {d.balance.length > 0 && (
        <Card>
          <SectionTitle title="All Balances" sub={`${d.balance.length} denom(s)`} icon={<Coins className="w-5 h-5 text-amber-400" />} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {d.balance.map((b: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <span className="font-mono text-xs">{b.denom}</span>
                <span className="text-sm font-medium">{formatQIE(b.amount, 6)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!d.accountInfo && !d.isEvm && d.balance.length === 0 && d.delegations.length === 0 && (
        <Card>
          <div className="text-center py-10 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No data found for this address.</p>
            <p className="text-xs mt-1 opacity-60">The address may not have any on-chain activity yet.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono text-xs break-all" : ""}`}>{value || "—"}</span>
    </div>
  );
}

function PieChartIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
