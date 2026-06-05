import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { useState } from "react";
import { 
  Layers, Coins, Shield, Clock, DollarSign, TrendingUp,
  ChevronDown, ChevronUp, Search, Cpu, Globe, GitCommit,
  Database, HardDrive, Wifi, Zap, Server
} from "lucide-react";

export const Route = createFileRoute("/parameters")({
  head: () => ({ meta: [{ title: "Parameters — QIE Explorer" }] }),
  component: ParamsPage,
});

function formatDuration(ns: string | number): string {
  const seconds = Number(ns) / 1_000_000_000;
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)} days`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} hrs`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} mins`;
  return `${Math.floor(seconds)}s`;
}

function ParamsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["params"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [staking, slashing, supply, pool, status, nodeInfo] = await Promise.all([
        cosmos.stakingParams().catch(() => null),
        cosmos.slashingParams().catch(() => null),
        cosmos.supply().catch(() => null),
        cosmos.stakingPool().catch(() => null),
        cosmos.status().catch(() => null),
        fetch(`${NETWORK.rest}/cosmos/base/tendermint/v1beta1/node_info`).then(r => r.json()).catch(() => null),
      ]);

      let mint = null;
      try { mint = await cosmos.mintParams(); } catch {}

      let gov = null;
      try {
        const govRes = await fetch(`${NETWORK.rest}/cosmos/gov/v1beta1/params/deposit`).then(r => r.json()).catch(() => null);
        const tallyRes = await fetch(`${NETWORK.rest}/cosmos/gov/v1beta1/params/tallying`).then(r => r.json()).catch(() => null);
        const votingRes = await fetch(`${NETWORK.rest}/cosmos/gov/v1beta1/params/voting`).then(r => r.json()).catch(() => null);
        gov = {
          deposit: govRes?.deposit_params,
          tally: tallyRes?.tally_params,
          voting: votingRes?.voting_params,
        };
      } catch {}

      let distribution = null;
      try {
        const distRes = await fetch(`${NETWORK.rest}/cosmos/distribution/v1beta1/params`).then(r => r.json()).catch(() => null);
        distribution = distRes?.params;
      } catch {}

      const totalSupply = supply?.find((s: any) => s.denom === NETWORK.denom)?.amount ?? "0";
      const bondedTokens = pool?.bonded_tokens ?? "0";
      const bondedRatio = Number(totalSupply) > 0 ? (Number(bondedTokens) / Number(totalSupply)) * 100 : 0;
      const height = status?.sync_info?.latest_block_height ?? "0";
      const appVersion = nodeInfo?.application_version;
      const defaultNodeInfo = nodeInfo?.default_node_info;

      return {
        staking,
        slashing,
        mint,
        gov,
        distribution,
        supply: {
          total: totalSupply,
          bonded: bondedTokens,
          bondedRatio,
        },
        chain: {
          chainId: NETWORK.cosmosChainId,
          height,
          network: NETWORK.name,
        },
        node: {
          version: appVersion?.version || status?.node_info?.version || "—",
          appName: appVersion?.app_name || "—",
          gitCommit: appVersion?.git_commit || "—",
          goVersion: appVersion?.go_version || status?.node_info?.go_version || "—",
          cosmosSdkVersion: appVersion?.cosmos_sdk_version || "—",
          buildTags: appVersion?.build_tags || "—",
          buildDeps: appVersion?.build_deps || [],
          moniker: status?.node_info?.moniker || "—",
          nodeId: status?.node_info?.id || "—",
          listenAddr: status?.node_info?.listen_addr || "—",
          network: status?.node_info?.network || "—",
          channels: status?.node_info?.channels || "—",
          protocolVersion: status?.node_info?.protocol_version,
        },
      };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const staking = data?.staking;
  const slashing = data?.slashing;
  const mint = data?.mint;
  const gov = data?.gov;
  const distribution = data?.distribution;
  const supply = data?.supply;
  const chain = data?.chain;
  const node = data?.node;

  return (
    <div className="space-y-6 pb-8">
      <SectionTitle 
        title="Chain Parameters" 
        sub="Real-time network configuration"
        icon={<Globe className="w-5 h-5 text-violet-500" />}
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <OverviewCard label="Chain ID" value={chain?.chainId || "—"} icon={<Globe className="w-4 h-4 text-violet-400" />} />
        <OverviewCard label="Height" value={Number(chain?.height).toLocaleString()} icon={<Database className="w-4 h-4 text-cyan-400" />} />
        <OverviewCard 
          label="Bonded / Supply" 
          value={`${formatQIE(supply?.bonded || "0", 0)} / ${formatQIE(supply?.total || "0", 0)}`}
          sub={`${NETWORK.symbol}`}
          icon={<Layers className="w-4 h-4 text-emerald-400" />} 
        />
        <OverviewCard label="Bonded Ratio" value={`${(supply?.bondedRatio || 0).toFixed(2)}%`} icon={<TrendingUp className="w-4 h-4 text-amber-400" />} />
        <OverviewCard label="Inflation" value={mint?.inflation ? `${(Number(mint.inflation) * 100).toFixed(2)}%` : "—"} icon={<Coins className="w-4 h-4 text-pink-400" />} />
      </div>

      {/* Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Staking */}
        <ParamCard icon={<Layers className="w-5 h-5 text-violet-400" />} title="Staking Parameters">
          <ParamRow label="Unbonding Time" value={staking?.unbonding_time ? formatDuration(staking.unbonding_time) : "—"} />
          <ParamRow label="Max Validators" value={staking?.max_validators?.toLocaleString()} />
          <ParamRow label="Max Entries" value={staking?.max_entries?.toLocaleString()} />
          <ParamRow label="Historical Entries" value={staking?.historical_entries?.toLocaleString()} />
          <ParamRow label="Bond Denom" value={staking?.bond_denom || "—"} mono />
        </ParamCard>

        {/* Governance */}
        <ParamCard icon={<Shield className="w-5 h-5 text-blue-400" />} title="Governance Parameters">
          <ParamRow label="Voting Period" value={gov?.voting?.voting_period ? formatDuration(gov.voting.voting_period) : "—"} />
          <ParamRow label="Min Deposit" value={gov?.deposit?.min_deposit?.[0] ? `${formatQIE(gov.deposit.min_deposit[0].amount, 0)} ${NETWORK.symbol}` : "—"} />
          <ParamRow label="Max Deposit Period" value={gov?.deposit?.max_deposit_period ? formatDuration(gov.deposit.max_deposit_period) : "—"} />
          <ParamRow label="Quorum" value={gov?.tally?.quorum ? `${(Number(gov.tally.quorum) * 100).toFixed(1)}%` : "—"} />
          <ParamRow label="Threshold" value={gov?.tally?.threshold ? `${(Number(gov.tally.threshold) * 100).toFixed(1)}%` : "—"} />
          <ParamRow label="Veto Threshold" value={gov?.tally?.veto_threshold ? `${(Number(gov.tally.veto_threshold) * 100).toFixed(1)}%` : "—"} />
        </ParamCard>

        {/* Distribution */}
        <ParamCard icon={<DollarSign className="w-5 h-5 text-emerald-400" />} title="Distribution Parameters">
          <ParamRow label="Community Tax" value={distribution?.community_tax ? `${(Number(distribution.community_tax) * 100).toFixed(2)}%` : "—"} />
          <ParamRow label="Base Proposer Reward" value={distribution?.base_proposer_reward ? `${(Number(distribution.base_proposer_reward) * 100).toFixed(2)}%` : "—"} />
          <ParamRow label="Bonus Proposer Reward" value={distribution?.bonus_proposer_reward ? `${(Number(distribution.bonus_proposer_reward) * 100).toFixed(2)}%` : "—"} />
          <ParamRow label="Withdraw Addr Enabled" value={distribution?.withdraw_addr_enabled !== undefined ? (distribution.withdraw_addr_enabled ? "True" : "False") : "—"} />
        </ParamCard>

        {/* Slashing */}
        <ParamCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />} title="Slashing Parameters">
          <ParamRow label="Signed Blocks Window" value={slashing?.signed_blocks_window?.toLocaleString()} />
          <ParamRow label="Min Signed Per Window" value={slashing?.min_signed_per_window ? `${(Number(slashing.min_signed_per_window) * 100).toFixed(0)}%` : "—"} />
          <ParamRow label="Downtime Jail Duration" value={slashing?.downtime_jail_duration ? formatDuration(slashing.downtime_jail_duration) : "—"} />
          <ParamRow label="Slash Fraction Double Sign" value={slashing?.slash_fraction_double_sign ? `${(Number(slashing.slash_fraction_double_sign) * 100).toFixed(2)}%` : "—"} />
          <ParamRow label="Slash Fraction Downtime" value={slashing?.slash_fraction_downtime ? `${(Number(slashing.slash_fraction_downtime) * 100).toFixed(2)}%` : "—"} />
        </ParamCard>
      </div>

      {/* Node Information */}
      <Card>
        <SectionTitle title="Node Information" sub={`${node?.moniker || "—"}`} icon={<Server className="w-5 h-5 text-cyan-500" />} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          <NodeInfoItem icon={<Globe className="w-4 h-4 text-violet-400" />} label="Network" value={node?.network || "—"} />
          <NodeInfoItem icon={<Cpu className="w-4 h-4 text-blue-400" />} label="App Name" value={node?.appName || "—"} />
          <NodeInfoItem icon={<Box className="w-4 h-4 text-emerald-400" />} label="Version" value={node?.version || "—"} />
          <NodeInfoItem icon={<GitCommit className="w-4 h-4 text-amber-400" />} label="Git Commit" value={node?.gitCommit || "—"} mono />
          <NodeInfoItem icon={<Zap className="w-4 h-4 text-cyan-400" />} label="Go Version" value={node?.goVersion || "—"} />
          <NodeInfoItem icon={<Layers className="w-4 h-4 text-pink-400" />} label="Cosmos SDK" value={node?.cosmosSdkVersion || "—"} />
          <NodeInfoItem icon={<Database className="w-4 h-4 text-violet-400" />} label="Node ID" value={node?.nodeId || "—"} mono />
          <NodeInfoItem icon={<Wifi className="w-4 h-4 text-emerald-400" />} label="Listen Addr" value={node?.listenAddr || "—"} mono />
          <NodeInfoItem icon={<Server className="w-4 h-4 text-amber-400" />} label="Channels" value={node?.channels || "—"} />
          {node?.protocolVersion && (
            <NodeInfoItem icon={<HardDrive className="w-4 h-4 text-blue-400" />} label="Protocol" value={`P2P: ${node.protocolVersion.p2p} / Block: ${node.protocolVersion.block} / App: ${node.protocolVersion.app}`} />
          )}
          {node?.buildTags && node?.buildTags !== "—" && (
            <NodeInfoItem icon={<Search className="w-4 h-4 text-rose-400" />} label="Build Tags" value={node.buildTags} />
          )}
          {node?.buildDeps && node.buildDeps.length > 0 && (
            <div className="col-span-full">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 mt-2 flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-amber-400" /> Build Dependencies ({node.buildDeps.length})
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {node.buildDeps.map((dep: any, i: number) => {
                  const path = typeof dep === "string" ? dep : dep.path ?? dep.name ?? "";
                  const ver = typeof dep === "object" ? dep.version ?? dep.sum ?? "" : "";
                  return (
                    <div key={i} className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg bg-muted/30">
                      <span className="font-mono text-muted-foreground truncate mr-2">{path}</span>
                      {ver && <span className="text-muted-foreground/50 shrink-0 font-mono">{ver}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function OverviewCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-bold text-lg tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ParamCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-semibold">{title}</h3>
        </div>
        {expanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
      </button>
      {expanded && <div className="px-4 pb-4 space-y-1">{children}</div>}
    </Card>
  );
}

function ParamRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0 gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-medium text-right shrink-0 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function NodeInfoItem({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="text-[11px] text-muted-foreground truncate">{label}</span>
      </div>
      <span className={`text-xs font-medium shrink-0 ml-2 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// Missing icons
function Box(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function AlertTriangle(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
