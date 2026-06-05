import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { Copy, Check, Server, Database, Clock, Key, FileText, Zap, AlertTriangle, ChevronRight, Info, ExternalLink } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/statesync")({
  head: () => ({ meta: [{ title: "State Sync — QIE Explorer" }] }),
  component: SSPage,
});

function SSPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["statesync"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const status = await cosmos.status();
      const netInfo = await cosmos.netInfo().catch(() => null);
      const latest = Number(status?.sync_info?.latest_block_height ?? 0);
      const trustH = Math.max(1, latest - 2000);
      const block = await cosmos.block(trustH).catch(() => null);
      
      return {
        latest,
        trustH,
        hash: block?.block_id?.hash ?? "—",
        nodeMoniker: status?.node_info?.moniker || "—",
        nodeVersion: status?.node_info?.version || "—",
        network: status?.node_info?.network || NETWORK.cosmosChainId,
        peers: netInfo?.n_peers ?? 0,
        rpcEndpoint: NETWORK.rpc,
        restEndpoint: NETWORK.rest,
        evmRpc: NETWORK.evmRpc,
      };
    },
  });

  function copy(k: string, v: string) {
    navigator.clipboard.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  }

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const cfgToml = `[statesync]
# State sync configuration for QIE Mainnet
enable = true
rpc_servers = "${data?.rpcEndpoint},${data?.rpcEndpoint}"
trust_height = ${data?.trustH}
trust_hash = "${data?.hash}"
trust_period = "168h0m0s"

# Optional: Add persistent peers for faster sync
# persistent_peers = ""`;

  const fullConfig = `# ============================================
# QIE Mainnet State Sync Configuration
# Generated from ${window.location.hostname}
# Block: #${data?.latest?.toLocaleString()}
# ============================================

[statesync]
enable = true
rpc_servers = "${data?.rpcEndpoint},${data?.rpcEndpoint}"
trust_height = ${data?.trustH}
trust_hash = "${data?.hash}"
trust_period = "168h0m0s"

# RPC & API Endpoints
# RPC: ${data?.rpcEndpoint}
# REST: ${data?.restEndpoint}
# EVM RPC: ${data?.evmRpc}
# Chain ID: ${data?.network}

# Quick sync command:
# qie start --x-crisis-skip-assert-invariants`;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <SectionTitle
        title="State Sync"
        sub="Bootstrap a full node in minutes instead of days"
        icon={<Server className="w-5 h-5 text-violet-500" />}
      />

      {/* Info Banner */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-full blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 grid place-items-center shrink-0">
            <Info className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">What is State Sync?</h3>
            <p className="text-sm text-muted-foreground">
              State Sync allows a new node to join the network by downloading a snapshot of the application state 
              at a specific height instead of replaying all blocks from genesis. This dramatically reduces sync time 
              from days to minutes.
            </p>
          </div>
        </div>
      </Card>

      {/* Network Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Current Block" value={`#${data?.latest?.toLocaleString()}`} icon={<Database className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Trust Height" value={`#${data?.trustH?.toLocaleString()}`} icon={<Key className="w-4 h-4 text-amber-400" />} />
        <StatCard label="Network" value={data?.network || "—"} icon={<Server className="w-4 h-4 text-blue-400" />} />
        <StatCard label="Peers" value={String(data?.peers)} icon={<Zap className="w-4 h-4 text-violet-400" />} />
      </div>

      {/* Required Parameters */}
      <Card>
        <SectionTitle title="Sync Parameters" sub="Required for state sync configuration" icon={<FileText className="w-5 h-5 text-violet-400" />} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <ParamField
            label="RPC Server"
            value={data?.rpcEndpoint || "—"}
            mono
            onCopy={() => copy("rpc", data?.rpcEndpoint || "")}
            copied={copied === "rpc"}
            icon={<Server className="w-4 h-4 text-blue-400" />}
          />
          <ParamField
            label="Trust Height"
            value={String(data?.trustH)}
            onCopy={() => copy("th", String(data?.trustH))}
            copied={copied === "th"}
            icon={<Database className="w-4 h-4 text-emerald-400" />}
          />
          <ParamField
            label="Trust Hash"
            value={data?.hash || "—"}
            mono
            onCopy={() => copy("hash", data?.hash || "")}
            copied={copied === "hash"}
            icon={<Key className="w-4 h-4 text-amber-400" />}
          />
          <ParamField
            label="Trust Period"
            value="168h0m0s (7 days)"
            onCopy={() => copy("tp", "168h0m0s")}
            copied={copied === "tp"}
            icon={<Clock className="w-4 h-4 text-cyan-400" />}
          />
        </div>
      </Card>

      {/* Endpoints */}
      <Card>
        <SectionTitle title="Network Endpoints" sub="Available RPC & API endpoints" icon={<ExternalLink className="w-5 h-5 text-cyan-400" />} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          <EndpointCard label="RPC Endpoint" value={data?.rpcEndpoint || "—"} />
          <EndpointCard label="REST API" value={data?.restEndpoint || "—"} />
          <EndpointCard label="EVM RPC" value={data?.evmRpc || "—"} />
        </div>
      </Card>

      {/* Config Snippet */}
      <Card>
        <SectionTitle title="config.toml" sub="Add this to your ~/.qie/config/config.toml" icon={<FileText className="w-5 h-5 text-violet-400" />} />
        <div className="relative mt-2">
          <pre className="text-xs font-mono p-5 rounded-xl bg-muted/50 border border-border/40 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
            {cfgToml}
          </pre>
          <button
            onClick={() => copy("cfg", cfgToml)}
            className="absolute top-4 right-4 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
          >
            {copied === "cfg" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === "cfg" ? "Copied!" : "Copy"}
          </button>
        </div>
      </Card>

      {/* Full Config */}
      <Card>
        <SectionTitle title="Full Configuration" sub="Complete state sync setup with all details" icon={<FileText className="w-5 h-5 text-amber-400" />} />
        <div className="relative mt-2">
          <pre className="text-xs font-mono p-5 rounded-xl bg-muted/50 border border-border/40 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-96 overflow-y-auto">
            {fullConfig}
          </pre>
          <button
            onClick={() => copy("full", fullConfig)}
            className="absolute top-4 right-4 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
          >
            {copied === "full" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === "full" ? "Copied!" : "Copy"}
          </button>
        </div>
      </Card>

      {/* Instructions */}
      <Card>
        <SectionTitle title="How to Use" sub="Step-by-step guide" icon={<ChevronRight className="w-5 h-5 text-emerald-400" />} />
        <div className="space-y-3 mt-2">
          <StepCard num={1} title="Install QIE" desc="Download and install the latest QIE binary from the official repository." />
          <StepCard num={2} title="Initialize Node" desc="Run qie init [moniker] to create your node configuration." />
          <StepCard num={3} title="Configure State Sync" desc="Copy the config.toml snippet above into your ~/.qie/config/config.toml file." />
          <StepCard num={4} title="Start with Flags" desc="Start your node with: qie start --x-crisis-skip-assert-invariants" />
          <StepCard num={5} title="Monitor Sync" desc="Check sync status: qie status | jq .sync_info. Your node should sync in minutes." />
        </div>
      </Card>
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

function ParamField({ label, value, mono, onCopy, copied, icon }: {
  label: string; value: string; mono?: boolean; onCopy: () => void; copied: boolean; icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card hover:border-violet-500/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-muted/50 grid place-items-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={`text-sm font-medium truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
        </div>
      </div>
      <button onClick={onCopy} className="text-muted-foreground hover:text-violet-400 transition-colors shrink-0 ml-2">
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function EndpointCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border border-border/40 bg-card">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-xs font-mono break-all">{value}</p>
    </div>
  );
}

function StepCard({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl bg-muted/30">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shrink-0 text-sm font-bold text-white">
        {num}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
