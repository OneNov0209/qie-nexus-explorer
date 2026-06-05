import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, evm, evmRpc, formatQIE, hexToNum, shorten } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { StatCard, Card, SectionTitle, Loading, Pill } from "@/components/ui/primitives";
import { Activity, Boxes, Coins, Users, TrendingUp, Layers, Percent, Clock, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import dayjs from "dayjs";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — QIE Explorer" },
    { name: "description", content: "Live QIE Mainnet stats: blocks, validators, supply, and APR." },
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
      return { status, vals, pool, supply, commPool, evmBlock };
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
      const count = 8;
      const heights = Array.from({ length: count }, (_, i) => latest - i);
      const blocks = await Promise.all(heights.map((h) => evm.getBlock(h, false).catch(() => null)));
      return { blocks: blocks.filter(Boolean), latest };
    },
  });
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
  const commPoolQ = data?.commPool?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";

  const blocks = recent.data?.blocks ?? [];
  let avgBlockTime: number | null = null;
  if (blocks.length > 1) {
    const t0 = hexToNum(blocks[0].timestamp) * 1000;
    const tN = hexToNum(blocks[blocks.length - 1].timestamp) * 1000;
    avgBlockTime = Math.abs(t0 - tN) / 1000 / (blocks.length - 1);
  }

  // Pie chart data
  const pieData = [
    { name: "Bonded", value: Number(bonded) / 1e18, color: "hsl(var(--primary))" },
    { name: "Liquid", value: (Number(supplyQ) - Number(bonded)) / 1e18, color: "hsl(var(--muted-foreground) / 0.3)" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border bg-card/50"
      >
        <div className="flex items-center gap-4">
          <img src={NETWORK.logo} alt="QIE" className="w-12 h-12 rounded-full ring-2 ring-primary/30" />
          <div>
            <div className="flex items-center gap-2">
              <Pill variant="success" className="text-xs"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live</Pill>
              <span className="text-xs text-muted-foreground font-mono">{NETWORK.cosmosChainId}</span>
            </div>
            <h1 className="text-xl font-bold mt-1">QIE Mainnet Explorer</h1>
            <p className="text-xs text-muted-foreground">Hybrid Cosmos + EVM · Chain {NETWORK.chainId}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Latest Block</div>
          <div className="text-3xl font-bold tabular-nums">{height ? Number(height).toLocaleString() : "—"}</div>
          <div className="text-xs text-muted-foreground">EVM: {evmHeight.toLocaleString()}</div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      {isLoading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Chain Height" value={Number(height ?? 0).toLocaleString()} icon={<Boxes className="w-4 h-4" />} />
          <StatCard label="Validators" value={validators.length} sub={`${activeVals} active`} icon={<Users className="w-4 h-4" />} />
          <StatCard label="Total Supply" value={formatQIE(supplyQ, 0)} sub={NETWORK.symbol} icon={<Coins className="w-4 h-4" />} />
          <StatCard label="Bonded" value={formatQIE(bonded, 0)} sub={`${stakingRatio.toFixed(2)}% staked`} icon={<Layers className="w-4 h-4" />} />
          <StatCard label="Block Time" value={avgBlockTime ? `${avgBlockTime.toFixed(2)}s` : "—"} icon={<Clock className="w-4 h-4" />} />
          <StatCard label="Staking Ratio" value={`${stakingRatio.toFixed(2)}%`} icon={<Percent className="w-4 h-4" />} />
          <StatCard label="Network" value="Healthy" sub="Producing blocks" icon={<Activity className="w-4 h-4 text-green-500" />} />
        </div>
      )}

      {/* Pie Chart + Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <Card className="lg:col-span-1">
          <SectionTitle title="Network Pulse" sub="Staking distribution" />
          <div className="flex items-center justify-center h-56">
            {Number(supplyQ) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} className="hover:opacity-90 transition-opacity" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">Loading data...</div>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-primary" />
              <span className="text-xs">Bonded {stakingRatio.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-muted-foreground/30" />
              <span className="text-xs">Liquid {(100 - stakingRatio).toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        {/* Latest Blocks */}
        <Card className="lg:col-span-2">
          <SectionTitle 
            title="Latest Blocks" 
            action={
              <Link to="/blocks" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            } 
          />
          <div className="divide-y divide-border/50">
            {blocks.slice(0, 8).map((b: any) => {
              const h = hexToNum(b.number);
              return (
                <Link
                  key={b.hash}
                  to="/blocks/$height"
                  params={{ height: String(h) }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center text-xs font-mono font-medium">
                      {h.toLocaleString()}
                    </span>
                    <div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {dayjs(hexToNum(b.timestamp) * 1000).format("HH:mm:ss")}
                      </div>
                      <div className="text-[11px] text-muted-foreground/60">{shorten(b.hash, 6, 4)}</div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {b.transactions?.length ?? 0} txs
                  </span>
                </Link>
              );
            })}
            {blocks.length === 0 && (
              <div className="text-sm text-muted-foreground p-6 text-center">Waiting for blocks...</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
