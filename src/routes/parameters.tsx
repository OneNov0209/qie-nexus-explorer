import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { useState } from "react";
import { 
  Layers, Coins, Shield, Clock, Users, Percent, 
  DollarSign, Key, TrendingUp, ChevronDown, ChevronUp,
  Search
} from "lucide-react";

export const Route = createFileRoute("/parameters")({
  head: () => ({ meta: [{ title: "Parameters — QIE Explorer" }] }),
  component: ParamsPage,
});

function ParamsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["params"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [staking, slashing, supply, pool, status] = await Promise.all([
        cosmos.stakingParams().catch(() => null),
        cosmos.slashingParams().catch(() => null),
        cosmos.supply().catch(() => null),
        cosmos.stakingPool().catch(() => null),
        cosmos.status().catch(() => null),
      ]);

      // Try mint params (may fail if module not active)
      let mint = null;
      try { mint = await cosmos.mintParams(); } catch {}

      // Try distribution params
      let distribution = null;
      try {
        const commPool = await cosmos.communityPool().catch(() => null);
        distribution = { community_pool: commPool };
      } catch {}

      const nodeInfo = status?.node_info;
      const totalSupply = supply?.find((s: any) => s.denom === NETWORK.denom)?.amount ?? "0";
      const bondedTokens = pool?.bonded_tokens ?? "0";

      return {
        staking,
        slashing,
        mint,
        supply: { total: totalSupply, bonded: bondedTokens },
        distribution,
        node: {
          network: nodeInfo?.network || NETWORK.cosmosChainId,
          version: nodeInfo?.version || "—",
          go_version: nodeInfo?.go_version || "—",
          moniker: nodeInfo?.moniker || "—",
        },
      };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  // Flatten all params for search
  const allParams: { section: string; key: string; value: any }[] = [];

  const addParams = (section: string, obj: any, prefix = "") => {
    if (!obj) return;
    Object.entries(obj).forEach(([k, v]) => {
      const label = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        addParams(section, v, label);
      } else {
        allParams.push({ section, key: label, value: v });
      }
    });
  };

  if (data?.staking) addParams("Staking", data.staking);
  if (data?.slashing) addParams("Slashing", data.slashing);
  if (data?.mint) addParams("Mint", data.mint);
  if (data?.supply) addParams("Supply", data.supply);
  if (data?.node) addParams("Node", data.node);

  const filtered = search
    ? allParams.filter(p => p.key.toLowerCase().includes(search.toLowerCase()) || p.section.toLowerCase().includes(search.toLowerCase()))
    : allParams;

  // Group by section
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach(p => {
    if (!grouped[p.section]) grouped[p.section] = [];
    grouped[p.section].push(p);
  });

  const sectionIcons: Record<string, React.ReactNode> = {
    Staking: <Layers className="w-5 h-5 text-violet-400" />,
    Slashing: <Shield className="w-5 h-5 text-red-400" />,
    Mint: <Coins className="w-5 h-5 text-amber-400" />,
    Supply: <DollarSign className="w-5 h-5 text-emerald-400" />,
    Node: <Key className="w-5 h-5 text-cyan-400" />,
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "—";

    // Format known fields
    if (key.includes("unbonding_time") || key.includes("voting_period") || key.includes("deposit_period")) {
      // Convert nanoseconds to readable duration
      const ns = Number(value);
      if (!isNaN(ns) && ns > 0) {
        const seconds = ns / 1_000_000_000;
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        return parts.join(" ");
      }
    }

    if (key.includes("denom") || key.includes("bond_denom")) return String(value);
    
    // Format large numbers (token amounts)
    if (typeof value === "string" && !isNaN(Number(value)) && Number(value) > 1_000_000 && key.includes("token") || key.includes("amount") || key.includes("supply") || key.includes("bonded")) {
      return `${formatQIE(value, 2)} ${NETWORK.symbol}`;
    }

    if (key.includes("rate") || key.includes("commission") || key.includes("inflation")) {
      if (typeof value === "string" && !isNaN(Number(value))) {
        return `${(Number(value) * 100).toFixed(2)}%`;
      }
    }

    if (key.includes("max_validators") || key.includes("max_entries")) return Number(value).toLocaleString();

    if (typeof value === "boolean") return value ? "True" : "False";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-6 pb-8">
      <SectionTitle 
        title="Chain Parameters" 
        sub="Real-time network configuration"
        icon={<Key className="w-5 h-5 text-violet-500" />}
      />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search parameters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-card text-sm focus:border-violet-500/50 focus:outline-none transition-colors"
        />
      </div>

      {/* Parameters by section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Object.entries(grouped).map(([section, params]) => (
          <ParamSection 
            key={section} 
            title={section} 
            icon={sectionIcons[section]} 
            params={params}
            formatValue={formatValue}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <div className="text-center py-10 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No parameters found matching "{search}"</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ParamSection({ 
  title, 
  icon, 
  params,
  formatValue 
}: { 
  title: string; 
  icon: React.ReactNode; 
  params: { key: string; value: any }[];
  formatValue: (key: string, value: any) => string;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-semibold text-lg">{title}</h3>
          <span className="text-xs text-muted-foreground">({params.length})</span>
        </div>
        {expanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {params.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0 gap-3">
              <dt className="text-xs text-muted-foreground font-mono min-w-0 break-all">{p.key}</dt>
              <dd className="text-sm font-medium text-right shrink-0 tabular-nums">{formatValue(p.key, p.value)}</dd>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
