import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { motion } from "framer-motion";
import { Coins, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/tokens")({
  head: () => ({ meta: [{ title: "Tokens — QIE Explorer" }] }),
  component: TokensPage,
});

function useTokens() {
  return useQuery({
    queryKey: ["tokens"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await fetch("https://mainnet.qie.digital/api/v2/tokens?limit=50");
      const data = await res.json();
      return (data?.items || []).map((item: any) => ({
        address: item.address,
        name: item.name || item.symbol || "Unknown",
        symbol: item.symbol || "—",
        type: item.type || "ERC-20",
        holders: item.holders || 0,
        exchangeRate: item.exchange_rate || null,
        totalSupply: item.total_supply || "0",
      }));
    },
  });
}

function TokensPage() {
  const { data, isLoading, error } = useTokens();

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SectionTitle title="Tokens" sub="ERC-20, ERC-721, ERC-1155 tokens" icon={<Coins className="w-5 h-5 text-amber-400" />} />
      </motion.div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Token</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Symbol</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Holders</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Address</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((token: any, i: number) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-medium">{token.name}</td>
                  <td className="p-4 text-muted-foreground">{token.symbol}</td>
                  <td className="p-4"><span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">{token.type}</span></td>
                  <td className="p-4 text-right font-mono text-xs">{token.holders?.toLocaleString()}</td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{token.address?.slice(0, 12)}...</td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No tokens found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
