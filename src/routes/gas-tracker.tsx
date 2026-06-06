import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Fuel, Zap, TrendingUp, Clock, Activity, BarChart3,
  Database, Users, Coins, ArrowRight, Globe, ExternalLink,
  Gauge, Flame, Droplets, Wind, Timer, Radio
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/gas-tracker")({
  head: () => ({ meta: [{ title: "Gas Tracker — QIE Explorer" }] }),
  component: GasTrackerPage,
});

function useGasData() {
  return useQuery({
    queryKey: ["gas-stats"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const [statsRes, txsRes] = await Promise.all([
        fetch("https://mainnet.qie.digital/api/v2/stats").then(r => r.json()),
        fetch("https://mainnet.qie.digital/api/v2/transactions?limit=30").then(r => r.json()),
      ]);

      const txs = (txsRes?.items || []).map((tx: any) => ({
        hash: tx.hash?.slice(0, 10) + "...",
        gas_price: Number(tx.gas_price || 0) / 1e9,
        gas_used: Number(tx.gas_used || 0),
        gas_limit: Number(tx.gas_limit || 0),
        fee: Number(tx.fee?.value || 0) / 1e18,
        type: tx.type === 2 ? "EIP-1559" : tx.type === 0 ? "Legacy" : "EIP-2930",
        time: new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: tx.method || "Transfer",
      }));

      return {
        gasPrices: statsRes?.gas_prices || { slow: 0, average: 0, fast: 0 },
        gasUsedToday: statsRes?.gas_used_today || "0",
        totalTransactions: statsRes?.total_transactions || "0",
        transactionsToday: statsRes?.transactions_today || "0",
        averageBlockTime: statsRes?.average_block_time || 0,
        totalAddresses: statsRes?.total_addresses || "0",
        networkUtilization: statsRes?.network_utilization_percentage || 0,
        coinPrice: statsRes?.coin_price || "0",
        coinPriceChange: statsRes?.coin_price_change_percentage || 0,
        marketCap: statsRes?.market_cap || "0",
        gasPriceUpdatedAt: statsRes?.gas_price_updated_at,
        txs,
      };
    },
  });
}

function GasTrackerPage() {
  const { data, isLoading, error } = useGasData();
  const [selectedGas, setSelectedGas] = useState<"slow" | "average" | "fast">("average");

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const gasPrices = data?.gasPrices || { slow: 0, average: 0, fast: 0 };

  const gasCards = [
    { key: "slow" as const, label: "Slow", icon: <Wind className="w-5 h-5" />, value: gasPrices.slow, color: "from-blue-500 to-cyan-500", textColor: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
    { key: "average" as const, label: "Average", icon: <Gauge className="w-5 h-5" />, value: gasPrices.average, color: "from-violet-500 to-fuchsia-500", textColor: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30" },
    { key: "fast" as const, label: "Fast", icon: <Flame className="w-5 h-5" />, value: gasPrices.fast, color: "from-amber-500 to-orange-500", textColor: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  ];

  const feeEstimates = {
    slow: { transfer: 21000, contract: 250000 },
    average: { transfer: 21000, contract: 250000 },
    fast: { transfer: 21000, contract: 250000 },
  };

  const selectedPrice = gasPrices[selectedGas];
  const selectedFee = feeEstimates[selectedGas];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SectionTitle
          title="Gas Tracker"
          sub="Real-time gas prices and network statistics"
          icon={<Fuel className="w-5 h-5 text-violet-500" />}
        />
      </motion.div>

      {/* Gas Price Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gasCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            onClick={() => setSelectedGas(card.key)}
            className={`relative cursor-pointer rounded-2xl border ${card.borderColor} ${card.bgColor} p-6 hover:scale-105 transition-all duration-300 ${
              selectedGas === card.key ? "ring-2 ring-violet-500 shadow-xl shadow-violet-500/20" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`${card.textColor}`}>{card.icon}</span>
                <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
              </div>
              <div className={`w-3 h-3 rounded-full ${card.textColor.replace("text-", "bg-")} animate-pulse`} />
            </div>
            <div className={`text-4xl font-bold ${card.textColor} tabular-nums`}>
              {card.value?.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Gwei</div>
          </motion.div>
        ))}
      </div>

      {/* Fee Estimator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative rounded-3xl overflow-hidden border border-violet-500/20 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-full blur-2xl" />
        <div className="relative p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Fuel className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-lg">Fee Estimator ({selectedGas.charAt(0).toUpperCase() + selectedGas.slice(1)})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-card/40 backdrop-blur-sm border border-border/40 p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Base Fee</div>
              <div className="text-2xl font-bold tabular-nums">{selectedPrice.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Gwei</div>
            </div>

            <div className="rounded-xl bg-card/40 backdrop-blur-sm border border-border/40 p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Transfer (21k gas)</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-400">
                {(selectedPrice * selectedFee.transfer / 1e9).toFixed(6)}
              </div>
              <div className="text-xs text-muted-foreground">QIE</div>
            </div>

            <div className="rounded-xl bg-card/40 backdrop-blur-sm border border-border/40 p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Contract Call (250k)</div>
              <div className="text-2xl font-bold tabular-nums text-violet-400">
                {(selectedPrice * selectedFee.contract / 1e9).toFixed(6)}
              </div>
              <div className="text-xs text-muted-foreground">QIE</div>
            </div>

            <div className="rounded-xl bg-card/40 backdrop-blur-sm border border-border/40 p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Priority Fee</div>
              <div className="text-2xl font-bold tabular-nums text-amber-400">
                {selectedGas === "fast" ? "1.5" : selectedGas === "average" ? "1.0" : "0.5"}
              </div>
              <div className="text-xs text-muted-foreground">Gwei</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground text-center">
            Last updated: {data?.gasPriceUpdatedAt ? new Date(data.gasPriceUpdatedAt).toLocaleString() : "—"}
          </div>
        </div>
      </motion.div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Transactions" value={Number(data?.totalTransactions || 0).toLocaleString()} icon={<Activity className="w-4 h-4 text-violet-400" />} />
        <StatCard label="Today's TXs" value={Number(data?.transactionsToday || 0).toLocaleString()} icon={<Zap className="w-4 h-4 text-amber-400" />} />
        <StatCard label="Total Addresses" value={Number(data?.totalAddresses || 0).toLocaleString()} icon={<Users className="w-4 h-4 text-cyan-400" />} />
        <StatCard label="Block Time" value={`${(data?.averageBlockTime || 0).toFixed(1)}s`} icon={<Clock className="w-4 h-4 text-emerald-400" />} />
      </div>

      {/* Recent Transactions Chart */}
      <Card>
        <SectionTitle title="Recent Gas Usage" sub="Last 30 transactions" icon={<BarChart3 className="w-5 h-5 text-violet-400" />} />
        <div className="h-64 mt-2">
          {data?.txs?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.txs} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D946EF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => `${Number(v).toFixed(2)} Gwei`}
                />
                <Area type="monotone" dataKey="gas_price" stroke="#8B5CF6" strokeWidth={2} fill="url(#gasGrad)" dot={false} name="Gas Price (Gwei)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">Loading chart...</div>
          )}
        </div>
      </Card>

      {/* Recent Transactions Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold inline-flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" /> Recent Transactions
          </h2>
          <a
            href="https://mainnet.qie.digital/txs"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
          >
            View all <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-3 text-xs text-muted-foreground uppercase tracking-wider">Hash</th>
                <th className="text-left p-3 text-xs text-muted-foreground uppercase tracking-wider">Method</th>
                <th className="text-left p-3 text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-right p-3 text-xs text-muted-foreground uppercase tracking-wider">Gas Price</th>
                <th className="text-right p-3 text-xs text-muted-foreground uppercase tracking-wider">Gas Used</th>
                <th className="text-right p-3 text-xs text-muted-foreground uppercase tracking-wider">Fee (QIE)</th>
              </tr>
            </thead>
            <tbody>
              {data?.txs?.map((tx: any, i: number) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <a
                      href={`https://mainnet.qie.digital/tx/${tx.hash?.replace('...', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-violet-400 hover:text-violet-300"
                    >
                      {tx.hash}
                    </a>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{tx.method}</td>
                  <td className="p-3">
                    <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">{tx.type}</span>
                  </td>
                  <td className="p-3 text-right font-mono text-xs">{tx.gas_price.toFixed(2)} Gwei</td>
                  <td className="p-3 text-right font-mono text-xs">{tx.gas_used.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-xs text-amber-400">{tx.fee.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-bold text-lg tabular-nums">{value}</p>
    </motion.div>
  );
}
