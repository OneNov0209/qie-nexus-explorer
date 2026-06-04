import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, evm, evmRpc, formatQIE, hexToNum, shorten } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { StatCard, Card, SectionTitle, Loading, Pill } from "@/components/ui/primitives";
import { Activity, Boxes, Coins, Users, TrendingUp, Layers, Percent, Database, Clock, Wallet } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
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
      const [status, vals, pool, supply, inflation, mintParams, annual, commPool, evmBlock] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.validators().catch(() => null),
        cosmos.stakingPool().catch(() => null),
        cosmos.supply().catch(() => null),
        cosmos.inflation().catch(() => "0"),
        cosmos.mintParams().catch(() => null),
        cosmos.annualProvisions().catch(() => "0"),
        cosmos.communityPool().catch(() => null),
        evmRpc<string>("eth_blockNumber").catch(() => "0x0"),
      ]);
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

function DashboardPage() {
  const { data, isLoading, error } = useStats();
  const recent = useRecentBlocks();

  const height = data?.status?.sync_info?.latest_block_height;
  const evmHeight = data?.evmBlock ? parseInt(data.evmBlock, 16) : 0;
  const validators = data?.vals?.validators ?? [];
  const activeVals = validators.filter((v: any) => v.status === "BOND_STATUS_BONDED").length;
  const bonded = data?.pool?.bonded_tokens ?? "0";
  const supplyQ = data?.supply?.find((s: any) => s.denom === NETWORK.denom)?.amount ?? "0";
  const stakingRatio = Number(bonded) && Number(supplyQ) ? (Number(bonded) / Number(supplyQ)) * 100 : 0;
  const inflationPct = Number(data?.inflation ?? 0) * 100;
  const apr = Number(supplyQ) && Number(bonded) ? (Number(data?.annual ?? 0) / Number(bonded)) * 100 : 0;
  const commPoolQ = data?.commPool?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";

  // Block-time calc
  const blocks = recent.data?.blocks ?? [];
  let avgBlockTime: number | null = null;
  if (blocks.length > 1) {
    const t0 = hexToNum(blocks[0].timestamp) * 1000;
    const tN = hexToNum(blocks[blocks.length - 1].timestamp) * 1000;
    avgBlockTime = Math.abs(t0 - tN) / 1000 / (blocks.length - 1);
  }

  const chartData = [...blocks].reverse().map((b: any) => ({
    h: hexToNum(b.number),
    txs: b.transactions?.length ?? 0,
    time: dayjs(hexToNum(b.timestamp) * 1000).format("HH:mm:ss"),
  }));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden glass-strong rounded-3xl p-8 md:p-10 grid-bg"
      >
        <div className="absolute inset-0 animate-gradient bg-[linear-gradient(135deg,rgba(216,79,184,0.10),transparent_40%,rgba(162,91,255,0.10))]" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/40 blur-xl animate-pulse-glow" />
              <img src={NETWORK.logo} alt="QIE" className="w-16 h-16 rounded-full ring-2 ring-primary/60 relative" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Pill variant="success"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live</Pill>
                <span className="text-xs text-muted-foreground">{NETWORK.cosmosChainId}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2"><span className="gradient-text">QIE Mainnet</span> Explorer</h1>
              <p className="text-sm text-muted-foreground mt-1">Hybrid Cosmos + EVM · Chain {NETWORK.chainId}</p>
            </div>
          </div>
          <div className="flex flex-col md:items-end gap-1">
            <div className="text-xs text-muted-foreground">Latest Block</div>
            <div className="text-4xl font-bold tabular-nums gradient-text">{height ? Number(height).toLocaleString() : "—"}</div>
            <div className="text-xs text-muted-foreground">EVM: {evmHeight.toLocaleString()}</div>
          </div>
        </div>
      </motion.section>

      {/* Stat grid */}
      {isLoading ? <Loading /> : error ? null : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Chain Height" value={Number(height ?? 0).toLocaleString()} icon={<Boxes className="w-4 h-4" />} accent />
          <StatCard label="Validators" value={validators.length} sub={`${activeVals} active`} icon={<Users className="w-4 h-4" />} />
          <StatCard label="Total Supply" value={formatQIE(supplyQ, 0)} sub={NETWORK.symbol} icon={<Coins className="w-4 h-4" />} />
          <StatCard label="Bonded" value={formatQIE(bonded, 0)} sub={`${stakingRatio.toFixed(2)}% staked`} icon={<Layers className="w-4 h-4" />} />
          <StatCard label="Inflation" value={`${inflationPct.toFixed(2)}%`} sub={`APR ${apr.toFixed(2)}%`} icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard label="Block Time" value={avgBlockTime ? `${avgBlockTime.toFixed(2)}s` : "—"} icon={<Clock className="w-4 h-4" />} />
          <StatCard label="Community Pool" value={formatQIE(commPoolQ, 0)} sub={NETWORK.symbol} icon={<Wallet className="w-4 h-4" />} />
          <StatCard label="EVM Height" value={evmHeight.toLocaleString()} icon={<Database className="w-4 h-4" />} />
          <StatCard label="Staking Ratio" value={`${stakingRatio.toFixed(2)}%`} icon={<Percent className="w-4 h-4" />} />
          <StatCard label="Network" value="Healthy" sub="Producing blocks" icon={<Activity className="w-4 h-4 text-green-400" />} />
        </div>
      )}

      {/* Chart */}
      <Card>
        <SectionTitle title="Transactions per recent block" sub="Live, last 20 blocks" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D84FB8" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#A25BFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="txs" stroke="#D84FB8" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent blocks + validators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle title="Latest Blocks" action={<Link to="/blocks" className="text-xs text-primary hover:underline">View all →</Link>} />
          <div className="space-y-1.5">
            {blocks.slice(0, 8).map((b: any) => (
              <Link key={b.header.height} to="/blocks/$height" params={{ height: b.header.height }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center text-xs font-mono">#</div>
                  <div>
                    <div className="font-mono text-sm group-hover:text-primary">{Number(b.header.height).toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">{dayjs(b.header.time).format("HH:mm:ss")}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{b.num_txs ?? 0} txs</div>
              </Link>
            ))}
            {blocks.length === 0 && <div className="text-xs text-muted-foreground p-4">No blocks yet…</div>}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Top Validators" action={<Link to="/staking" className="text-xs text-primary hover:underline">View all →</Link>} />
          <div className="space-y-1.5">
            {validators
              .filter((v: any) => v.status === "BOND_STATUS_BONDED")
              .sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens))
              .slice(0, 8)
              .map((v: any, i: number) => (
                <div key={v.operator_address} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</div>
                    <div>
                      <div className="text-sm font-medium">{v.description?.moniker ?? shorten(v.operator_address)}</div>
                      <div className="text-[11px] text-muted-foreground">Commission {(Number(v.commission?.commission_rates?.rate ?? 0) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="text-xs tabular-nums">{formatQIE(v.tokens, 0)} {NETWORK.symbol}</div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
