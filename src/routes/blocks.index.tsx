import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { evm, hexToNum, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { Boxes, Clock, ChevronRight, BarChart3, Activity, Zap, User, Hash, Layers, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import dayjs from "dayjs";
import { useMemo } from "react";

export const Route = createFileRoute("/blocks/")({
  head: () => ({ meta: [{ title: "Blocks — QIE Explorer" }] }),
  component: BlocksListPage,
});

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
      height: hexToNum(b.number),
      txs: b.transactions?.length ?? 0,
      gasUsed: b.gasUsed ? hexToNum(b.gasUsed) : 0,
      gasLimit: b.gasLimit ? hexToNum(b.gasLimit) : 1,
      gasPct: b.gasLimit ? ((hexToNum(b.gasUsed || 0) / hexToNum(b.gasLimit || 1)) * 100).toFixed(1) : 0,
      time: dayjs(hexToNum(b.timestamp) * 1000).format("HH:mm:ss"),
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

      {/* Chart */}
      <Card>
        <SectionTitle title="Block Activity" sub="Transactions & Gas per block" icon={<BarChart3 className="w-5 h-5 text-violet-400" />} />
        <div className="flex items-center gap-4 mb-2 px-2">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-3 h-0.5 rounded-full bg-violet-500" /> TXs
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-3 h-0.5 rounded-full bg-cyan-400" /> Gas %
          </span>
        </div>
        <div className="h-56 px-2 pb-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="blocksTxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                    <stop offset="60%" stopColor="#D946EF" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#D946EF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="blocksGasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" hide />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="txs" name="Transactions" stroke="#8B5CF6" strokeWidth={2} fill="url(#blocksTxGrad)" dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2, fill: "#8B5CF6" }} />
                <Area yAxisId="right" type="monotone" dataKey="gasPct" name="Gas Used %" stroke="#06B6D4" strokeWidth={1.5} fill="url(#blocksGasGrad)" dot={false} activeDot={{ r: 3, stroke: "#fff", strokeWidth: 2, fill: "#06B6D4" }} />
              </AreaChart>
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
