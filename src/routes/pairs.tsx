import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTopPairs } from "@/lib/subgraph";
import { Card, SectionTitle, Loading } from "@/components/ui/primitives";
import { ArrowRight, TrendingUp, DollarSign, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/pairs")({
  head: () => ({ meta: [{ title: "Trading Pairs — QIE Explorer" }] }),
  component: PairsPage,
});

function PairsPage() {
  const { data: pairs, isLoading, error } = useQuery({
    queryKey: ["top-pairs"],
    queryFn: () => getTopPairs(20),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">Failed to load pairs data</p>
        <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SectionTitle 
          title="Trading Pairs" 
          sub="Live data from QIEDEX Subgraph" 
          icon={<BarChart3 className="w-5 h-5 text-violet-400" />}
        />
        <div className="text-xs text-muted-foreground">
          Updated every 10s
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          label="Total Pairs" 
          value={pairs?.length || 0} 
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard 
          label="Total Volume (24h)" 
          value={`$${pairs?.reduce((sum, p) => sum + Number(p.volumeUSD || 0), 0).toLocaleString()}`}
          icon={<DollarSign className="w-4 h-4 text-amber-400" />}
        />
        <StatCard 
          label="Active Tokens" 
          value={new Set(pairs?.flatMap(p => [p.token0.symbol, p.token1.symbol])).size}
          icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
        />
        <StatCard 
          label="Top Pair" 
          value={pairs?.[0]?.token0.symbol + "/" + pairs?.[0]?.token1.symbol || "-"}
          icon={<ArrowRight className="w-4 h-4 text-violet-400" />}
        />
      </div>

      {/* Pair List */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">#</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Pair</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Reserve</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Volume (24h)</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Liquidity</th>
              </tr>
            </thead>
            <tbody>
              {pairs?.map((pair, index) => {
                const price = Number(pair.token0Price);
                const volume = Number(pair.volumeUSD || 0);
                const liquidity = Number(pair.totalSupply || 0);

                return (
                  <tr 
                    key={pair.id} 
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-4 text-muted-foreground font-mono text-xs">#{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-[8px] font-bold">
                            {pair.token0.symbol.charAt(0)}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-[8px] font-bold">
                            {pair.token1.symbol.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">
                            {pair.token0.symbol} / {pair.token1.symbol}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {pair.token0.name} → {pair.token1.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono">
                      <div className="font-medium">
                        {price > 0.01 ? price.toFixed(4) : price.toFixed(8)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        1 {pair.token0.symbol}
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-xs">
                      <div>{Number(pair.reserve0).toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">{pair.token0.symbol}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-emerald-400">
                        ${volume.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">24h volume</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium">
                        ${(liquidity * price).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Total liquidity</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-border/50 text-center text-[11px] text-muted-foreground bg-muted/20">
          Data sourced from QIEDEX Subgraph · {pairs?.length || 0} pairs loaded
        </div>
      </Card>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode 
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-bold text-lg tabular-nums">{value}</p>
    </div>
  );
}
