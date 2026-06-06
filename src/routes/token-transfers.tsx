import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { shorten } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowRightLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export const Route = createFileRoute("/token-transfers")({
  head: () => ({ meta: [{ title: "Token Transfers — QIE Explorer" }] }),
  component: TokenTransfersPage,
});

function useTokenTransfers() {
  return useQuery({
    queryKey: ["token-transfers"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const res = await fetch("https://mainnet.qie.digital/api/v2/token-transfers?limit=50");
      const data = await res.json();
      return (data?.items || []).map((item: any) => ({
        txHash: item.tx_hash,
        from: item.from?.hash,
        to: item.to?.hash,
        token: item.token?.symbol || item.token?.name || "Unknown",
        tokenAddress: item.token?.address,
        amount: item.total?.value ? (Number(item.total.value) / Math.pow(10, Number(item.total.decimals || 18))).toFixed(4) : "0",
        time: item.timestamp,
      }));
    },
  });
}

function TokenTransfersPage() {
  const { data, isLoading, error } = useTokenTransfers();

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SectionTitle title="Token Transfers" sub="Latest token transfer events" icon={<ArrowRightLeft className="w-5 h-5 text-cyan-400" />} />
      </motion.div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">TX Hash</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Token</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">From</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">To</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Time</th>
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
                  <td className="p-4 font-medium text-xs">{tx.token}</td>
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
                  <td className="p-4 text-right font-mono text-xs">{tx.amount}</td>
                  <td className="p-4 text-right text-xs text-muted-foreground">{dayjs(tx.time).fromNow()}</td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">No token transfers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
