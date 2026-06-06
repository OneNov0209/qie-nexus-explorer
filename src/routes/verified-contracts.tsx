import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { shorten } from "@/lib/api";
import { motion } from "framer-motion";
import { FileCheck, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/verified-contracts")({
  head: () => ({ meta: [{ title: "Verified Contracts — QIE Explorer" }] }),
  component: VerifiedContractsPage,
});

function useVerifiedContracts() {
  return useQuery({
    queryKey: ["verified-contracts"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await fetch("https://mainnet.qie.digital/api/v2/smart-contracts?limit=50");
      const data = await res.json();
      return (data?.items || []).map((item: any) => ({
        address: item.address?.hash,
        name: item.name || "Unnamed",
        compiler: item.compiler_version || "—",
        evmVersion: item.evm_version || "—",
        optimization: item.optimization_enabled || false,
        verifiedAt: item.verified_at,
        language: item.language || "Solidity",
      }));
    },
  });
}

function VerifiedContractsPage() {
  const { data, isLoading, error } = useVerifiedContracts();

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SectionTitle title="Verified Contracts" sub="Smart contracts with verified source code" icon={<FileCheck className="w-5 h-5 text-emerald-400" />} />
      </motion.div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Contract</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Language</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Compiler</th>
                <th className="text-center p-4 text-xs text-muted-foreground uppercase tracking-wider">Optimized</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Address</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((contract: any, i: number) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <Link to="/address/$address" params={{ address: contract.address }} className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
                      {contract.name}
                    </Link>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">{contract.language}</td>
                  <td className="p-4 text-xs text-muted-foreground">{contract.compiler}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${contract.optimization ? "bg-emerald-500/10 text-emerald-400" : "bg-muted/50 text-muted-foreground"}`}>
                      {contract.optimization ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{shorten(contract.address, 10, 8)}</td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No verified contracts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
