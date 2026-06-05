import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, shorten } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { useState } from "react";
import {
  GitBranch, Radio, Server, Wifi, Link2, ArrowRightLeft,
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Layers, Cpu, Globe, ExternalLink, RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/ibc")({
  head: () => ({ meta: [{ title: "IBC — QIE Explorer" }] }),
  component: IBCPage,
});

const STATE_INFO: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default"; icon: any }> = {
  "STATE_OPEN": { label: "Open", variant: "success", icon: CheckCircle },
  "STATE_INIT": { label: "Init", variant: "warning", icon: Clock },
  "STATE_TRYOPEN": { label: "TryOpen", variant: "warning", icon: AlertTriangle },
  "STATE_CLOSED": { label: "Closed", variant: "danger", icon: XCircle },
  "STATE_UNINITIALIZED": { label: "Uninitialized", variant: "default", icon: AlertTriangle },
};

function IBCPage() {
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [expandedConns, setExpandedConns] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"channels" | "connections" | "clients">("channels");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["ibc-full"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [channelsRes, connsRes, clientsRes] = await Promise.all([
        cosmos.ibcChannels().catch(() => ({ channels: [], pagination: {} })),
        cosmos.ibcConnections().catch(() => ({ connections: [], pagination: {} })),
        cosmos.ibcClients().catch(() => ({ client_states: [], pagination: {} })),
      ]);

      const channels = (channelsRes?.channels ?? []).map((c: any) => ({
        ...c,
        stateInfo: STATE_INFO[c.state] || { label: c.state || "Unknown", variant: "default" as const, icon: AlertTriangle },
      }));

      const connections = (connsRes?.connections ?? []).map((c: any) => ({
        ...c,
        stateInfo: STATE_INFO[c.state] || { label: c.state || "Unknown", variant: "default" as const, icon: AlertTriangle },
      }));

      const clients = (clientsRes?.client_states ?? []).map((c: any) => {
        const clientState = c.client_state;
        return {
          ...c,
          clientId: c.client_id,
          chainId: clientState?.chain_id || "—",
          latestHeight: clientState?.latest_height,
          trustPeriod: clientState?.trusting_period,
          unbondingPeriod: clientState?.unbonding_period,
        };
      });

      // Stats
      const openChannels = channels.filter((c: any) => c.state === "STATE_OPEN").length;
      const openConns = connections.filter((c: any) => c.state === "STATE_OPEN").length;
      const totalClients = clients.length;

      return {
        channels,
        connections,
        clients,
        stats: {
          openChannels,
          openConns,
          totalClients,
          totalChannels: channels.length,
          totalConns: connections.length,
        },
      };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const toggleChannel = (id: string) => {
    const newSet = new Set(expandedChannels);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedChannels(newSet);
  };

  const toggleConn = (id: string) => {
    const newSet = new Set(expandedConns);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedConns(newSet);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <SectionTitle
          title="IBC"
          sub="Inter-Blockchain Communication"
          icon={<Link2 className="w-5 h-5 text-violet-500" />}
        />
        <button onClick={() => refetch()} disabled={isFetching}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Open Channels" value={data?.stats?.openChannels ?? 0} icon={<Radio className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Open Connections" value={data?.stats?.openConns ?? 0} icon={<Wifi className="w-4 h-4 text-blue-400" />} />
        <StatCard label="Total Clients" value={data?.stats?.totalClients ?? 0} icon={<Server className="w-4 h-4 text-violet-400" />} />
        <StatCard label="Total Channels" value={data?.stats?.totalChannels ?? 0} icon={<GitBranch className="w-4 h-4 text-amber-400" />} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card border border-border/60 rounded-xl p-1 w-fit">
        {([
          { key: "channels", label: "Channels", count: data?.channels?.length },
          { key: "connections", label: "Connections", count: data?.connections?.length },
          { key: "clients", label: "Clients", count: data?.clients?.length },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm rounded-lg transition-all ${
              activeTab === tab.key
                ? "bg-violet-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} <span className="text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Channels Tab */}
      {activeTab === "channels" && (
        <div className="space-y-3">
          {(data?.channels ?? []).length === 0 ? (
            <Card><div className="text-center py-10 text-muted-foreground text-sm">No IBC channels found.</div></Card>
          ) : (
            (data?.channels ?? []).map((c: any, i: number) => {
              const StateIcon = c.stateInfo.icon;
              const isExpanded = expandedChannels.has(c.channel_id + c.port_id);

              return (
                <Card key={i} className="hover:border-violet-500/20 transition-all">
                  <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleChannel(c.channel_id + c.port_id)}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                        c.state === "STATE_OPEN" ? "bg-emerald-500/10" : "bg-amber-500/10"
                      }`}>
                        <StateIcon className={`w-5 h-5 ${c.state === "STATE_OPEN" ? "text-emerald-400" : "text-amber-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-sm">{c.channel_id}</span>
                          <Pill variant={c.stateInfo.variant}>{c.stateInfo.label}</Pill>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Port: <span className="font-mono">{c.port_id}</span></span>
                          <span>·</span>
                          <span>Counterparty: <span className="font-mono">{c.counterparty?.channel_id || "—"}</span></span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-muted-foreground shrink-0 mt-2" /> : <ChevronDown size={18} className="text-muted-foreground shrink-0 mt-2" />}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <DetailRow label="Channel ID" value={c.channel_id} mono />
                      <DetailRow label="Port ID" value={c.port_id} mono />
                      <DetailRow label="State" value={c.state} />
                      <DetailRow label="Ordering" value={c.ordering || "—"} />
                      <DetailRow label="Version" value={c.version || "—"} />
                      <DetailRow label="Connection Hops" value={c.connection_hops?.join(", ") || "—"} mono />
                      <DetailRow label="Counterparty Channel" value={c.counterparty?.channel_id || "—"} mono />
                      <DetailRow label="Counterparty Port" value={c.counterparty?.port_id || "—"} mono />
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Connections Tab */}
      {activeTab === "connections" && (
        <div className="space-y-3">
          {(data?.connections ?? []).length === 0 ? (
            <Card><div className="text-center py-10 text-muted-foreground text-sm">No IBC connections found.</div></Card>
          ) : (
            (data?.connections ?? []).map((c: any, i: number) => {
              const StateIcon = c.stateInfo.icon;
              const isExpanded = expandedConns.has(c.id);

              return (
                <Card key={i} className="hover:border-violet-500/20 transition-all">
                  <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleConn(c.id)}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                        c.state === "STATE_OPEN" ? "bg-emerald-500/10" : "bg-amber-500/10"
                      }`}>
                        <StateIcon className={`w-5 h-5 ${c.state === "STATE_OPEN" ? "text-emerald-400" : "text-amber-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-sm">{c.id}</span>
                          <Pill variant={c.stateInfo.variant}>{c.stateInfo.label}</Pill>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Client: <span className="font-mono">{c.client_id}</span></span>
                          <span>·</span>
                          <span>Versions: {c.versions?.length ?? 0}</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-muted-foreground shrink-0 mt-2" /> : <ChevronDown size={18} className="text-muted-foreground shrink-0 mt-2" />}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <DetailRow label="Connection ID" value={c.id} mono />
                      <DetailRow label="Client ID" value={c.client_id} mono />
                      <DetailRow label="State" value={c.state} />
                      <DetailRow label="Delay Period" value={c.delay_period ? `${c.delay_period}ns` : "—"} />
                      {c.counterparty && (
                        <>
                          <DetailRow label="Counterparty Client" value={c.counterparty.client_id} mono />
                          <DetailRow label="Counterparty Connection" value={c.counterparty.connection_id} mono />
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === "clients" && (
        <div className="space-y-3">
          {(data?.clients ?? []).length === 0 ? (
            <Card><div className="text-center py-10 text-muted-foreground text-sm">No IBC clients found.</div></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(data?.clients ?? []).map((c: any, i: number) => (
                <Card key={i} className="hover:border-violet-500/20 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 grid place-items-center shrink-0">
                      <Globe className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-sm">{c.clientId}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Chain ID: <span className="font-mono">{c.chainId}</span></p>
                      {c.latestHeight && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Latest Height: <span className="font-mono">{c.latestHeight.revision_number || "0"}-{c.latestHeight.revision_height || "0"}</span>
                        </p>
                      )}
                      {c.trustPeriod && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Trust Period: <span className="font-mono">{Math.floor(Number(c.trustPeriod) / 1_000_000_000 / 86400)} days</span>
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-bold text-lg tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`text-sm ${mono ? "font-mono text-xs break-all" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
