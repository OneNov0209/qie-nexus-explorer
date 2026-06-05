import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, evm, evmRpc, formatQIE, hexToNum, shorten } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { StatCard, Card, SectionTitle, Loading, Pill } from "@/components/ui/primitives";
import { Activity, Boxes, Coins, Users, TrendingUp, Layers, Percent, Database, Clock, Wallet, Zap, Sparkles, ChevronRight, AlertCircle } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import dayjs from "dayjs";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — QIE Explorer" },
    { name: "description", content: "Live QIE Mainnet stats: blocks, validators, supply, inflation and APR." },
  ]}),
  component: DashboardPage,
});

function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const [status, vals, pool, supply, commPool, evmBlock] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.validators().catch(() => null),
        cosmos.stakingPool().catch(() => null),
        cosmos.supply().catch(() => null),
        cosmos.communityPool().catch(() => null),
        evmRpc<string>("eth_blockNumber").catch(() => "0x0"),
      ]);
      const inflation = await cosmos.inflation().catch(() => null);
      const mintParams = await cosmos.mintParams().catch(() => null);
      const annual = await cosmos.annualProvisions().catch(() => null);
      return { status, vals, pool, supply, inflation, mintParams, annual, commPool, evmBlock };
    },
  });
}

function useRecentBlocks() {
  return useQuery({
    queryKey: ["recent-blocks-evm"],
    refetchInterval: 6_000,
    queryFn: async () => {
      const latest = await evm.blockNumber();
      if (!latest) return { blocks: [] as any[], latest: 0 };
      const count = 20;
      const start = Math.max(0, latest - count + 1);
      const heights = Array.from({ length: latest - start + 1 }, (_, i) => latest - i);
      const blocks = await Promise.all(heights.map((h) => evm.getBlock(h, false).catch(() => null)));
      return { blocks: blocks.filter(Boolean), latest };
    },
  });
}

const chartTheme = {
  gradient: {
    txs: ["#8B5CF6", "#D946EF"],
    gas: ["#06B6D4", "#10B981"],
    volume: ["#F59E0B", "#EF4444"],
  },
  grid: "rgba(147, 51, 234, 0.08)",
  axis: "#A78BFA",
  tooltip: "rgba(15, 15, 25, 0.95)",
  tooltipBorder: "rgba(147, 51, 234, 0.3)",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="backdrop-blur-xl rounded-xl border border-purple-500/20 bg-[rgba(15,15,25,0.95)] p-4 shadow-2xl shadow-purple-500/10">
      <p className="text-xs font-medium text-purple-300 mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm tabular-nums flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="font-bold text-white">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function DashboardPage() {
  const { data, isLoading } = useStats();
  const recent = useRecentBlocks();

  const evmHeight = data?.evmBlock ? parseInt(data.evmBlock, 16) : 0;
  const height = data?.status?.sync_info?.latest_block_height ?? evmHeight;
  const validators = data?.vals?.validators ?? [];
  const activeVals = validators.filter((v: any) => v.status === "BOND_STATUS_BONDED").length;
  const bonded = data?.pool?.bonded_tokens ?? "0";
  const supplyQ = data?.supply?.find((s: any) => s.denom === NETWORK.denom)?.amount ?? "0";
  const stakingRatio = Number(bonded) && Number(supplyQ) ? (Number(bonded) / Number(supplyQ)) * 100 : 0;
  const inflationPct = data?.inflation ? Number(data.inflation) * 100 : null;
  const apr = Number(supplyQ) && Number(bonded) && data?.annual ? (Number(data.annual) / Number(bonded)) * 100 : null;
  const commPoolQ = data?.commPool?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";

  const blocks = recent.data?.blocks ?? [];
  let avgBlockTime: number | null = null;
  if (blocks.length > 1) {
    const t0 = hexToNum(blocks[0].timestamp) * 1000;
    const tN = hexToNum(blocks[blocks.length - 1].timestamp) * 1000;
    avgBlockTime = Math.abs(t0 - tN) / 1000 / (blocks.length - 1);
  }

  const chartData = [...blocks].reverse().map((b: any) => {
    const gasUsed = b.gasUsed ? hexToNum(b.gasUsed) : 0;
    const gasLimit = b.gasLimit ? hexToNum(b.gasLimit) : 1;
    return {
      h: hexToNum(b.number),
      txs: b.transactions?.length ?? 0,
      gasPct: gasLimit > 0 ? Math.round((gasUsed / gasLimit) * 100) : 0,
      time: dayjs(hexToNum(b.timestamp) * 1000).format("HH:mm:ss"),
    };
  });

  return (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(139, 92, 246, 0.15), transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(217, 70, 239, 0.1), transparent 50%), rgba(15, 15, 25, 0.8)",
          border: "1px solid rgba(139, 92, 246, 0.2)",
          boxShadow: "0 0 60px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-fuchsia-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 blur-xl animate-pulse opacity-60" />
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-500/50 to-fuchsia-500/50 blur-md animate-pulse" style={{ animationDelay: "0.5s" }} />
              <img src={NETWORK.logo} alt="QIE" className="w-16 h-16 rounded-full ring-2 ring-purple-400/60 relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Pill variant="success" className="bg-green-500/10 text-green-400 border-green-500/30">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" /> Live
                </Pill>
                <span className="text-xs text-purple-300/70 font-mono">{NETWORK.cosmosChainId}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2 bg-gradient-to-r from-purple-300 via-fuchsia-300 to-purple-300 bg-clip-text text-transparent">
                QIE Mainnet Explorer
              </h1>
              <p className="text-sm text-purple-300/50 mt-1 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Hybrid Cosmos + EVM · Chain {NETWORK.chainId}
              </p>
            </div>
          </div>
          <div className="flex flex-col md:items-end gap-1">
            <div className="text-xs text-purple-300/50 uppercase tracking-wider">Latest Block</div>
            <div className="text-4xl font-bold tabular-nums bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              {height ? Number(height).toLocaleString() : "—"}
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-300/50">
              <Zap className="w-3 h-3 text-yellow-400" />
              EVM: {evmHeight.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Stat grid */}
      {isLoading ? <Loading /> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Chain Height" value={Number(height ?? 0).toLocaleString()} icon={<Boxes className="w-4 h-4 text-purple-400" />} accent />
          <StatCard label="Validators" value={validators.length} sub={`${activeVals} active`} icon={<Users className="w-4 h-4 text-blue-400" />} />
          <StatCard label="Total Supply" value={formatQIE(supplyQ, 0)} sub={NETWORK.symbol} icon={<Coins className="w-4 h-4 text-amber-400" />} />
          <StatCard label="Bonded" value={formatQIE(bonded, 0)} sub={`${stakingRatio.toFixed(2)}% staked`} icon={<Layers className="w-4 h-4 text-emerald-400" />} />
          <StatCard label="Inflation" value={inflationPct !== null ? `${inflationPct.toFixed(2)}%` : "—"} sub={apr !== null ? `APR ${apr.toFixed(2)}%` : "—"} icon={<TrendingUp className="w-4 h-4 text-rose-400" />} />
          <StatCard label="Block Time" value={avgBlockTime ? `${avgBlockTime.toFixed(2)}s` : "—"} icon={<Clock className="w-4 h-4 text-cyan-400" />} />
          <StatCard label="Community Pool" value={formatQIE(commPoolQ, 0)} sub={NETWORK.symbol} icon={<Wallet className="w-4 h-4 text-teal-400" />} />
          <StatCard label="EVM Height" value={evmHeight.toLocaleString()} icon={<Database className="w-4 h-4 text-indigo-400" />} />
          <StatCard label="Staking Ratio" value={`${stakingRatio.toFixed(2)}%`} icon={<Percent className="w-4 h-4 text-pink-400" />} />
          <StatCard label="Network" value="Healthy" sub="Producing blocks" icon={<Activity className="w-4 h-4 text-green-400" />} />
        </div>
      )}

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 !p-0 overflow-hidden relative" style={{
          background: "linear-gradient(135deg, rgba(15,15,25,0.9), rgba(25,15,40,0.9))",
          border: "1px solid rgba(139, 92, 246, 0.15)",
          boxShadow: "0 0 40px rgba(139, 92, 246, 0.05)",
        }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 opacity-50" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Block Activity
                </h3>
                <p className="text-xs text-purple-300/50">Transactions & gas usage per block</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500" />
                  <span className="text-[11px] text-purple-300/70">TXs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
                  <span className="text-[11px] text-purple-300/70">Gas %</span>
                </div>
              </div>
            </div>
          </div>
          <div className="h-72 px-4 pb-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="txsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                      <stop offset="50%" stopColor="#D946EF" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#D946EF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(147, 51, 234, 0.08)" vertical={false} />
                  <XAxis dataKey="time" stroke={chartTheme.axis} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke={chartTheme.axis} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" stroke={chartTheme.axis} fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="txs" name="Transactions" stroke="#8B5CF6" strokeWidth={2} fill="url(#txsGrad)" filter="url(#glow)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#8B5CF6" }} />
                  <Area yAxisId="right" type="monotone" dataKey="gasPct" name="Gas Used %" stroke="#06B6D4" strokeWidth={1.5} fill="url(#gasGrad)" dot={false} activeDot={{ r: 3, strokeWidth: 2, stroke: "#fff", fill: "#06B6D4" }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-purple-300/40 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" /> Waiting for block data...
              </div>
            )}
          </div>
        </Card>

        {/* Quick Stats Panel */}
        <Card style={{
          background: "linear-gradient(180deg, rgba(15,15,25,0.9), rgba(25,15,40,0.9))",
          border: "1px solid rgba(139, 92, 246, 0.15)",
        }}>
          <SectionTitle title="Network Pulse" sub="Real-time metrics" />
          <div className="space-y-3 mt-2">
            {[
              { label: "Block Height", value: Number(height ?? 0).toLocaleString(), color: "from-purple-400 to-fuchsia-400" },
              { label: "Active Validators", value: `${activeVals} / ${validators.length}`, color: "from-blue-400 to-cyan-400" },
              { label: "Staking Ratio", value: `${stakingRatio.toFixed(2)}%`, color: "from-emerald-400 to-teal-400" },
              { label: "Avg Block Time", value: avgBlockTime ? `${avgBlockTime.toFixed(2)}s` : "—", color: "from-amber-400 to-orange-400" },
              { label: "Total Supply", value: `${formatQIE(supplyQ, 1)} ${NETWORK.symbol}`, color: "from-rose-400 to-pink-400" },
              { label: "Community Pool", value: formatQIE(commPoolQ, 1), color: "from-indigo-400 to-purple-400" },
            ].map((item) => (
              <div key={item.label} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                <span className="text-xs text-purple-300/60">{item.label}</span>
                <span className={`text-sm font-bold tabular-nums bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent blocks + validators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card style={{
          background: "linear-gradient(135deg, rgba(15,15,25,0.9), rgba(25,15,40,0.9))",
          border: "1px solid rgba(139, 92, 246, 0.15)",
        }}>
          <SectionTitle title="Latest Blocks" action={<Link to="/blocks" className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>} />
          <div className="space-y-1">
            {blocks.slice(0, 8).map((b: any) => {
              const h = hexToNum(b.number);
              return (
                <Link key={b.hash} to="/blocks/$height" params={{ height: String(h) }}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 grid place-items-center text-xs font-mono text-purple-300 group-hover:from-purple-500/30 group-hover:to-fuchsia-500/30 transition-all">
                      {h.toLocaleString()}
                    </div>
                    <div>
                      <div className="text-[11px] text-purple-300/50 font-mono">
                        {dayjs(hexToNum(b.timestamp) * 1000).format("HH:mm:ss")}
                      </div>
                      <div className="text-[10px] text-purple-300/30">{shorten(b.hash, 8, 6)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-purple-300/70 tabular-nums">{b.transactions?.length ?? 0}</span>
                    <span className="text-[10px] text-purple-300/40">txs</span>
                  </div>
                </Link>
              );
            })}
            {blocks.length === 0 && (
              <div className="text-xs text-purple-300/40 p-6 text-center">Waiting for blocks...</div>
            )}
          </div>
        </Card>

        <Card style={{
          background: "linear-gradient(135deg, rgba(15,15,25,0.9), rgba(25,15,40,0.9))",
          border: "1px solid rgba(139, 92, 246, 0.15)",
        }}>
          <SectionTitle title="Top Validators" action={<Link to="/staking" className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>} />
          <div className="space-y-1">
            {validators
              .filter((v: any) => v.status === "BOND_STATUS_BONDED")
              .sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens))
              .slice(0, 8)
              .map((v: any, i: number) => (
                <div key={v.operator_address} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg grid place-items-center text-xs font-bold ${
                      i < 3 ? "bg-gradient-to-br from-amber-400/20 to-yellow-500/20 text-amber-400" : "text-purple-300/40 bg-white/[0.02]"
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-purple-100">{v.description?.moniker ?? shorten(v.operator_address)}</div>
                      <div className="text-[11px] text-purple-300/40">
                        {((Number(v.commission?.commission_rates?.rate ?? 0)) * 100).toFixed(1)}% commission
                      </div>
                    </div>
                  </div>
                  <div className="text-xs tabular-nums text-purple-300/70 font-medium">
                    {formatQIE(v.tokens, 0)} {NETWORK.symbol}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
