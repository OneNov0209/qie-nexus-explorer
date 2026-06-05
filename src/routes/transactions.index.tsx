import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { evm, hexToNum, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { ArrowRightLeft, Clock, Boxes, Fuel, ChevronRight, Activity, Zap } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import dayjs from "dayjs";

export const Route = createFileRoute("/transactions/")({
  head: () => ({ meta: [{ title: "Transactions — QIE Explorer" }] }),
  component: TransactionsListPage,
});

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-3 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm tabular-nums flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function TransactionsListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["recent-txs-with-chart"],
    refetchInterval: 8000,
    queryFn: async () => {
      const latest = await evm.blockNumber();
      const count = 20;
      const start = Math.max(0, latest - count + 1);
      const heights = Array.from({ length: latest - start + 1 }, (_, i) => latest - i);
      const blocks = await Promise.all(
        heights.map((h) => evm.getBlock(h, true).catch(() => null))
      );
      
      const allTxs: any[] = [];
      const chartData: any[] = [];
      
      blocks.filter(Boolean).forEach((b: any) => {
        const h = hexToNum(b.number);
        const ts = hexToNum(b.timestamp) * 1000;
        const txs = b.transactions ?? [];
        
        chartData.push({
          block: h,
          txs: txs.length,
          time: dayjs(ts).format("HH:mm"),
        });
        
        txs.slice(0, 5).forEach((tx: any) => {
          allTxs.push({
            hash: typeof tx === "string" ? tx : tx.hash,
            block: h,
            time: ts,
            from: typeof tx === "string" ? null : tx.from,
            to: typeof tx === "string" ? null : tx.to,
            value: typeof tx === "string" ? null : tx.value,
            gasPrice: typeof tx === "string" ? null : tx.gasPrice,
          });
        });
      });
      
      return { txs: allTxs.slice(0, 50), chartData: chartData.reverse() };
    },
  });

  const txs = data?.txs ?? [];
  const chartData = data?.chartData ?? [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SectionTitle 
          title="Transactions" 
          sub="Recent transactions across latest blocks"
          icon={<ArrowRightLeft className="w-5 h-5 text-cyan-500" />}
        />
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Auto-refresh 8s
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            {txs.length} tx found
          </span>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <SectionTitle title="Transaction Activity" sub="TX count per block (last 20 blocks)" />
        <div className="h-48 px-2 pb-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="txChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.5} />
                    <stop offset="60%" stopColor="#8B5CF6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="txs" name="Transactions" stroke="#06B6D4" strokeWidth={2.5} fill="url(#txChartGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#06B6D4" }} isAnimationActive={true} animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading chart...</div>
          )}
        </div>
      </Card>

      {/* Transaction List */}
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Tx Hash</th>
                  <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Block</th>
                  <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">From</th>
                  <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">To</th>
                  <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Value</th>
                  <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t: any, i: number) => (
                  <tr key={`${t.hash}-${i}`} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                    <td className="p-4">
                      <Link
                        to="/tx/$hash"
                        params={{ hash: String(t.hash) }}
                        className="font-mono text-xs text-cyan-500 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                        {shorten(String(t.hash), 8, 8)}
                      </Link>
                    </td>
                    <td className="p-4">
                      <Link to="/blocks/$height" params={{ height: String(t.block) }} className="font-mono text-xs text-violet-400 hover:text-violet-300">
                        #{t.block.toLocaleString()}
                      </Link>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {t.from ? shorten(t.from, 6, 4) : "—"}
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {t.to ? shorten(t.to, 6, 4) : "Contract"}
                    </td>
                    <td className="p-4 text-right text-xs tabular-nums font-medium">
                      {t.value && Number(t.value) > 0 ? (
                        <span className="text-amber-400">{(Number(t.value) / 1e18).toFixed(4)} QIE</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {dayjs(t.time).format("HH:mm:ss")}
                      </span>
                    </td>
                  </tr>
                ))}
                {txs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No recent transactions found</p>
                      <p className="text-xs mt-1 opacity-60">Waiting for new blocks...</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
