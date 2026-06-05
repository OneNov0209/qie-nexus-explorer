import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { Code2, Info, ExternalLink, Package, Database } from "lucide-react";

export const Route = createFileRoute("/cosmwasm")({
  head: () => ({ meta: [{ title: "CosmWasm — QIE Explorer" }] }),
  component: CWPage,
});

function CWPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["wasm-codes"],
    refetchInterval: 120_000,
    queryFn: async () => {
      try {
        const res = await fetch(
          "https://api.qie.onenov.xyz/cosmwasm/wasm/v1/code?pagination.limit=50"
        ).then(r => r.json());

        if (res?.code_infos) {
          return { available: true, codes: res.code_infos, contracts: res?.contracts || [], pagination: res?.pagination };
        }
        return { available: false, codes: [] };
      } catch {
        return { available: false, codes: [] };
      }
    },
  });

  if (isLoading) return <Loading />;

  const isAvailable = data?.available;
  const codes = data?.codes ?? [];

  return (
    <div className="space-y-6 pb-8">
      <SectionTitle
        title="CosmWasm"
        sub={isAvailable ? `${codes.length} stored code IDs` : "Smart contract platform"}
        icon={<Code2 className="w-5 h-5 text-violet-500" />}
      />

      {/* Info Banner */}
      {!isAvailable && (
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-full blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 grid place-items-center shrink-0">
              <Info className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">CosmWasm Not Available</h3>
              <p className="text-sm text-muted-foreground">
                The CosmWasm module is not enabled on QIE Mainnet. CosmWasm is a smart contracting platform built for the Cosmos ecosystem that allows developers to write smart contracts in Rust and deploy them on Cosmos SDK-based blockchains.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <a
                  href="https://cosmwasm.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Learn more about CosmWasm
                </a>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Status" value={isAvailable ? "Enabled" : "Disabled"} icon={isAvailable ? <Code2 className="w-4 h-4 text-emerald-400" /> : <Info className="w-4 h-4 text-amber-400" />} />
        <StatCard label="Code IDs" value={codes.length.toString()} icon={<Package className="w-4 h-4 text-blue-400" />} />
        <StatCard label="Contracts" value={data?.contracts?.length?.toString() || "—"} icon={<Database className="w-4 h-4 text-violet-400" />} />
        <StatCard label="Network" value="QIE Mainnet" icon={<Code2 className="w-4 h-4 text-cyan-400" />} />
      </div>

      {/* Code List */}
      {isAvailable && codes.length > 0 && (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Code ID</th>
                  <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Creator</th>
                  <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Hash</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c: any) => (
                  <tr key={c.code_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-bold text-violet-400">{c.code_id}</span>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{c.creator}</td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {(c.data_hash ?? "").slice(0, 24)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isAvailable && codes.length === 0 && (
        <Card>
          <div className="text-center py-10 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No CosmWasm codes stored yet.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
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
