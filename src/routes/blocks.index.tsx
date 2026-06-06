import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { evm, hexToNum, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { Boxes, Clock, BarChart3, Activity, Zap, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import dayjs from "dayjs";
import { useMemo } from "react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/blocks/")({
  head: () => ({ meta: [{ title: "Blocks — QIE Explorer" }] }),
  component: BlocksListPage,
});

// Warna solid terang untuk dark mode
const BAR_COLORS = {
  high: "#D946EF",    // pink terang
  medium: "#8B5CF6",  // ungu terang
  low: "#06B6D4",     // cyan terang
  empty: "#374151",   // abu-abu gelap
};

function getBarColor(txs: number): string {
  if (txs >= 5) return BAR_COLORS.high;
  if (txs >= 2) return BAR_COLORS.medium;
  if (txs >= 1) return BAR_COLORS.low;
  return BAR_COLORS.empty;
}

function BlocksListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["blocks-list-evm"],
    refetchInterval: 6000,
    queryFn: async () => {
      const latest = await evm.blockNumber();
      const count = 30;
      const start = Math.max(0, latest - count + 1);
      const heights = Array.from({ length: latest - start + 1 }, (_, i) => latest - i);
      const blocks = await Promise.all(heights.map((h) => evm.getBlock(h, true).catch(() => null)));
      return blocks.filter(Boolean);
    },
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data].reverse().map((b: any) => ({
      name: `#${hexToNum(b.number)}`,
      txs: b.transactions?.length ?? 0,
      time: dayjs(hexToNum(b.timestamp) * 1000).format("HH:mm"),
    }));
  }, [data]);

  const stats = useMemo(() => {
    if (!data?.length) return { totalTxs: 0, avgGas: 0, avgBlockTime: 0 };
    const totalTxs = data.reduce((s, b) => s + (b.transactions?.length ?? 0), 0);
    const totalGas = data.reduce((s, b) => s + (b.gasUsed ? hexToNum(b.gasUsed) : 0), 0);
    const avgGas = totalGas / data.length;
    const timestamps = data.map(b => hexToNum(b.timestamp) * 1000);
    const avgBlockTime = timestamps.length > 1 
      ? Math.abs(timestamps[0] - timestamps[timestamps.length - 1]) / 1000 / (timestamps.length - 1)
      : 0;
    return { totalTxs, avgGas: Math.round(avgGas), avgBlockTime };
  }, [data]);

  return (
    <div className="space-y-6 pb-8">
      <SectionTitle 
        title="Blocks" 
        sub={`Latest ${data?.length || 0} blocks · Auto-refresh every 6s`}
        icon={<Boxes className="w-5 h-5 text-violet-500" />}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border-2 border-border/60 bg-card p-4 hover:border-violet-500/20 transition-all shadow-lg">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Boxes className="w-4 h-4 text-violet-400" />
            <span className="text-[11px] uppercase tracking-wider">Total Blocks</span>
          </div>
          <p className="font-bold text-lg tabular-nums">{data?.length || 0}</p>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-card p-4 hover:border-violet-500/20 transition-all shadow-lg">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] uppercase tracking-wider">Total TXs</span>
          </div>
          <p className="font-bold text-lg tabular-nums">{stats.totalTxs.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-card p-4 hover:border-violet-500/20 transition-all shadow-lg">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] uppercase tracking-wider">Avg Gas Used</span>
          </div>
          <p className="font-bold text-lg tabular-nums">{stats.avgGas.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-card p-4 hover:border-violet-500/20 transition-all shadow-lg">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] uppercase tracking-wider">Avg Block Time</span>
          </div>
          <p className="font-bold text-lg tabular-nums">{stats.avgBlockTime.toFixed(2)}s</p>
        </div>
      </div>

      {/* BAR CHART - dengan warna solid kontras + animasi */}
      <Card>
        <SectionTitle title="Block Activity" sub="Transactions per block · Live updating" icon={<BarChart3 className="w-5 h-5 text-violet-400" />} />
        
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 px-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-3 h-3 rounded-sm" style={{ background: BAR_COLORS.high }} /> 5+ TXs
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-3 h-3 rounded-sm" style={{ background: BAR_COLORS.medium }} /> 2-4 TXs
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-3 h-3 rounded-sm" style={{ background: BAR_COLORS.low }} /> 1 TX
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-3 h-3 rounded-sm border border-border" style={{ background: BAR_COLORS.empty }} /> Empty
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-violet-400 ml-auto">
            <TrendingUp className="w-3.5 h-3.5 animate-pulse" /> Live
          </span>
        </div>

        <div className="h-72 px-2 pb-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  interval={3}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  allowDecimals={false}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{ 
                    background: "hsl(var(--card))", 
                    border: "2px solid hsl(var(--border))", 
                    borderRadius: 12, 
                    fontSize: 12,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                  }}
                  formatter={(value: any) => [`${value} TXs`, "Transactions"]}
                  labelFormatter={(label: string) => `Block ${label}`}
                  cursor={{ fill: 'hsl(var(--muted) / 0.1)' }}
                />
                <Bar 
                  dataKey="txs" 
                  name="Transactions" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={16}
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={index} 
                      fill={getBarColor(entry.txs)}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Waiting for data...</div>
          )}
        </div>
      </Card>

      {/* Block List Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Height</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Age</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">TXs</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Gas Used</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Miner</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Hash</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((b: any) => {
                const height = hexToNum(b.number);
                const ts = hexToNum(b.timestamp) * 1000;
                const gasUsed = b.gasUsed ? hexToNum(b.gasUsed) : 0;
                const gasLimit = b.gasLimit ? hexToNum(b.gasLimit) : 1;
                const gasPct = gasLimit > 0 ? ((gasUsed / gasLimit) * 100).toFixed(1) : "0";

                return (
                  <tr key={b.hash} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                    <td className="p-4">
                      <Link
                        to="/blocks/$height"
                        params={{ height: String(height) }}
                        className="flex items-center gap-2 group/link"
                      >
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center shrink-0">
                          <Boxes className="w-3.5 h-3.5 text-violet-400" />
                        </span>
                        <span className="font-mono font-bold text-violet-400 group-hover/link:text-violet-300 transition-colors">
                          #{height.toLocaleString()}
                        </span>
                      </Link>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {dayjs(ts).fromNow()}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-xs tabular-nums">
                      <span className={b.transactions?.length > 0 ? "text-cyan-400 font-bold" : "text-muted-foreground"}>
                        {b.transactions?.length ?? 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: `${Math.min(Number(gasPct), 100)}%` }} />
                        </div>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{gasPct}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs text-muted-foreground">{shorten(b.miner, 8, 6)}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs text-muted-foreground/60">{shorten(b.hash, 10, 8)}</span>
                    </td>
                  </tr>
                );
              })}
              {(!data || data.length === 0) && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">No blocks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
