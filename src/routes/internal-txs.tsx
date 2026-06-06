import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { shorten } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export const Route = createFileRoute("/internal-txs")({
  head: () => ({ meta: [{ title: "Internal Transactions — QIE Explorer" }] }),
  component: InternalTxsPage,
});

function useInternalTxs() {
  return useQuery({
    queryKey: ["internal-txs"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const res = await fetch("https://mainnet.qie.digital/api/v2/internal-transactions?limit=50");
      const data = await res.json();
      return (data?.items || []).map((item: any) => ({
        txHash: item.transaction_hash,
        block: item.block_number,
        from: item.from?.hash,
        to: item.to?.hash,
        value: item.value ? (Number(item.value) / 1e18).toFixed(6) : "0",
        type: item.type || "call",
        time: item.timestamp,
        gasUsed: item.gas_used,
      }));
    },
  });
}

function InternalTxsPage() {
  const { data, isLoading, error } = useInternalTxs();

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SectionTitle title="Internal Transactions" sub="Contract internal calls & value transfers" icon={<ArrowDownLeft className="w-5 h-5 text-cyan-400" />} />
      </motion.div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Parent TX</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">From</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">To</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Value (QIE)</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Block</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((tx: any, i: number) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <Link to="/tx/$hash" params={{ hash: tx.txHash }} className="font-mono text-xs text-violet-400 hover:text-violet-300">
                      {tx.txHash?.slice(0, 12)}...
                    </Link>
                  </td>
                  <td className="p-4"><span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full">{tx.type}</span></td>
                  <td className="p-4">
                    <Link to="/address/$address" params={{ address: tx.from }} className="font-mono text-xs text-violet-400 hover:text-violet-300">
                      {shorten(tx.from, 8, 6)}
                    </Link>
                  </td>
                  <td className="p-4">
                    <Link to="/address/$address" params={{ address: tx.to }} className="font-mono text-xs text-violet-400 hover:text-violet-300">
                      {shorten(tx.to, 8, 6)}
                    </Link>
                  </td>
                  <td className="p-4 text-right font-mono text-xs">{tx.value}</td>
                  <td className="p-4 text-right font-mono text-xs text-muted-foreground">{tx.block?.toLocaleString()}</td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">No internal transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
