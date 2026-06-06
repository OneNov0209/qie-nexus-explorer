import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { shorten } from "@/lib/api";
import { motion } from "framer-motion";
import { Users, Trophy, TrendingUp, Wallet, ExternalLink } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/top-accounts")({
  head: () => ({ meta: [{ title: "Top Accounts — QIE Explorer" }] }),
  component: TopAccountsPage,
});

function useTopAccounts() {
  return useQuery({
    queryKey: ["top-accounts"],
    refetchInterval: 30_000,
    queryFn: async () => {
      // Fetch from Blockscout API
      const res = await fetch("https://mainnet.qie.digital/api/v2/addresses?limit=50");
      const data = await res.json();
      
      const items = (data?.items || []).map((item: any, i: number) => ({
        rank: i + 1,
        address: item.hash,
        balance: (Number(item.coin_balance || 0) / 1e18).toFixed(4),
        txCount: item.transaction_count || 0,
        isContract: item.is_contract || false,
        token: item.token,
      }));

      return items;
    },
  });
}

function TopAccountsPage() {
  const { data, isLoading, error } = useTopAccounts();
  const [sort, setSort] = useState<"rank" | "balance">("rank");

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const sorted = [...(data || [])].sort((a, b) => {
    if (sort === "balance") return Number(b.balance) - Number(a.balance);
    return a.rank - b.rank;
  });

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SectionTitle title="Top Accounts" sub="Addresses ranked by balance" icon={<Trophy className="w-5 h-5 text-amber-400" />} />
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Accounts" value={(data?.length || 0).toLocaleString()} icon={<Users className="w-4 h-4 text-violet-400" />} />
        <StatCard label="Top Balance" value={`${data?.[0]?.balance || "0"} ${NETWORK.symbol}`} icon={<Wallet className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Sort by" value={sort === "rank" ? "Rank" : "Balance"} icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} onClick={() => setSort(s => s === "rank" ? "balance" : "rank")} clickable />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">#</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Address</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Balance</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">TX Count</th>
                <th className="text-center p-4 text-xs text-muted-foreground uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item: any, i: number) => (
                <tr key={item.address} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <span className={`font-mono text-xs font-bold ${i < 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${item.rank}`}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link
                      to="/address/$address"
                      params={{ address: item.address }}
                      className="font-mono text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      {shorten(item.address, 10, 8)}
                    </Link>
                  </td>
                  <td className="p-4 text-right font-mono text-xs font-medium">{Number(item.balance).toLocaleString()} {NETWORK.symbol}</td>
                  <td className="p-4 text-right font-mono text-xs text-muted-foreground">{item.txCount?.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.isContract ? "bg-cyan-500/10 text-cyan-400" : "bg-muted/50 text-muted-foreground"}`}>
                      {item.isContract ? "Contract" : "EOA"}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No accounts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, onClick, clickable }: { label: string; value: string; icon: React.ReactNode; onClick?: () => void; clickable?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors ${clickable ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-[11px] uppercase tracking-wider">{label}</span></div>
      <p className="font-bold text-lg tabular-nums">{value}</p>
    </div>
  );
}
