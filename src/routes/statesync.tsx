import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/statesync")({
  head: () => ({ meta: [{ title: "State Sync — QIE Explorer" }] }),
  component: SSPage,
});

function SSPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["statesync"], refetchInterval: 30_000,
    queryFn: async () => {
      const status = await cosmos.status();
      const latest = Number(status?.sync_info?.latest_block_height ?? 0);
      const trustH = Math.max(1, latest - 2000);
      const block = await cosmos.block(trustH);
      return { latest, trustH, hash: block?.block_id?.hash };
    },
  });
  const [copied, setCopied] = useState<string | null>(null);
  function copy(k: string, v: string) { navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500); }

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const cfg = `[statesync]
enable = true
rpc_servers = "${NETWORK.rpc},${NETWORK.rpc}"
trust_height = ${data?.trustH}
trust_hash = "${data?.hash}"
trust_period = "168h0m0s"`;

  return (
    <div className="space-y-6">
      <SectionTitle title="State Sync" sub="Bootstrap a node fast" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="RPC Server" value={NETWORK.rpc} k="rpc" onCopy={copy} copied={copied} />
        <Field label="Trust Height" value={String(data?.trustH ?? "")} k="th" onCopy={copy} copied={copied} />
        <Field label="Trust Hash" value={data?.hash ?? ""} k="hash" onCopy={copy} copied={copied} />
      </div>
      <Card>
        <h3 className="font-semibold mb-3">config.toml snippet</h3>
        <div className="relative">
          <pre className="text-xs font-mono p-4 rounded-xl bg-black/40 border border-border overflow-x-auto">{cfg}</pre>
          <button onClick={() => copy("cfg", cfg)} className="absolute top-3 right-3 glass rounded-lg px-2 py-1 text-xs flex items-center gap-1">
            {copied === "cfg" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
          </button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value, k, onCopy, copied }: any) {
  return (
    <Card>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-xs break-all">{value}</span>
        <button onClick={() => onCopy(k, value)} className="text-muted-foreground hover:text-primary shrink-0">
          {copied === k ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </Card>
  );
}
