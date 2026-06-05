import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { Activity, Radio, Zap, Clock, Server, Wifi, RefreshCw, Network, Award, Users, Circle } from "lucide-react";

export const Route = createFileRoute("/consensus")({
  head: () => ({ meta: [{ title: "Consensus — QIE Explorer" }] }),
  component: ConsensusPage,
});

const STEP_INFO: Record<string, { name: string; icon: any; color: string }> = {
  "0": { name: "New Round", icon: Radio, color: "text-blue-400" },
  "1": { name: "Propose", icon: Zap, color: "text-amber-400" },
  "2": { name: "Prevote", icon: Activity, color: "text-orange-400" },
  "3": { name: "Precommit", icon: Award, color: "text-violet-400" },
  "4": { name: "Commit", icon: CheckCircleIcon, color: "text-emerald-400" },
};

function ConsensusPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["consensus-v2"],
    refetchInterval: 5000,
    queryFn: async () => {
      const [status, cs, net, vals] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.consensusState().catch(() => null),
        cosmos.netInfo().catch(() => null),
        cosmos.validators().catch(() => ({ validators: [] })),
      ]);

      let dumpData = null;
      try {
        const dumpRes = await fetch(`/api/rpc/dump_consensus_state`).then(r => r.json());
        dumpData = dumpRes?.result?.round_state;
      } catch {}

      const roundState = cs?.round_state ?? {};
      const [height, round, step] = String(roundState["height/round/step"] ?? "").split("/");

      // Build validator name map
      const validatorMap: Record<string, string> = {};
      (vals?.validators ?? []).forEach((v: any) => {
        if (v.consensus_pubkey?.key) {
          validatorMap[v.consensus_pubkey.key] = v.description?.moniker || shorten(v.operator_address, 8, 6);
        }
      });

      const dumpValidators = dumpData?.validators?.validators || [];
      const currentVoteSet = roundState?.height_vote_set?.[0];
      const prevotes: string[] = currentVoteSet?.prevotes || [];
      const precommits: string[] = currentVoteSet?.precommits || [];
      const proposerIndex = Number(roundState?.proposer?.index ?? 0);
      const activePrevotes = prevotes.filter((v: string) => v?.toLowerCase() !== "nil-vote").length;
      const activePrecommits = precommits.filter((v: string) => v?.toLowerCase() !== "nil-vote").length;
      const totalVals = dumpValidators.length || prevotes.length || 1;

      return {
        height: height || "—",
        round: round || "—",
        step: step || "0",
        startTime: roundState?.start_time,
        proposer: roundState?.proposer?.address,
        proposerIndex,
        nodeInfo: status?.node_info,
        syncInfo: status?.sync_info,
        peers: net?.peers ?? [],
        nPeers: net?.n_peers ?? 0,
        currentVoteSet,
        prevotes,
        precommits,
        activePrevotes,
        activePrecommits,
        totalVals,
        dumpValidators,
        validatorMap,
        onboardRate: totalVals > 0 ? Math.round((activePrevotes / totalVals) * 100) : 0,
      };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const step = data?.step || "0";
  const stepInfo = STEP_INFO[step] || { name: `Step ${step}`, icon: Activity, color: "text-muted-foreground" };
  const StepIcon = stepInfo.icon;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <SectionTitle title="Consensus State" sub="Live Tendermint consensus · Update every 5s" icon={<Network className="w-5 h-5 text-violet-500" />} />
        <button onClick={() => refetch()} disabled={isFetching}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Onboard Rate" value={`${data?.onboardRate}%`} icon={<Radio className="w-5 h-5 text-white" />} gradient="from-rose-500 to-red-500" />
        <StatCard label="Block Height" value={Number(data?.height).toLocaleString()} icon={<Server className="w-5 h-5 text-white" />} gradient="from-emerald-500 to-teal-500" />
        <StatCard label="Round" value={data?.round || "—"} icon={<Zap className="w-5 h-5 text-white" />} gradient="from-violet-500 to-purple-500" />
        <StatCard label="Step" value={stepInfo.name} icon={<StepIcon className="w-5 h-5 text-white" />} gradient="from-blue-500 to-cyan-500" stepColor={stepInfo.color} />
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IndicatorCard icon={<Wifi className="w-4 h-4 text-emerald-400" />} label="Network Sync" value={Number(data?.height).toLocaleString()} sub="Latest Block" live />
        <IndicatorCard icon={<Activity className="w-4 h-4 text-blue-400" />} label="Active Votes" value={`${data?.activePrevotes} / ${data?.totalVals}`} progress={data?.onboardRate} progressColor="from-emerald-400 to-blue-500" />
        <IndicatorCard icon={<Users className="w-4 h-4 text-violet-400" />} label="Peers" value={String(data?.nPeers)} sub="Connected" />
      </div>

      {/* Node + Sync Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <SectionTitle title="Node Info" icon={<Server className="w-5 h-5 text-violet-400" />} />
          <div className="space-y-2 mt-2">
            <InfoRow label="Moniker" value={data?.nodeInfo?.moniker || "—"} />
            <InfoRow label="Version" value={data?.nodeInfo?.version || "—"} />
            <InfoRow label="Network" value={data?.nodeInfo?.network || "—"} />
            <InfoRow label="Listening" value={data?.nodeInfo?.listen_addr || "—"} mono />
          </div>
        </Card>
        <Card>
          <SectionTitle title="Sync Info" icon={<Wifi className="w-5 h-5 text-emerald-400" />} />
          <div className="space-y-2 mt-2">
            <InfoRow label="Latest Block" value={Number(data?.syncInfo?.latest_block_height || 0).toLocaleString()} />
            <InfoRow label="Latest App Hash" value={data?.syncInfo?.latest_app_hash?.slice(0, 24) + "..." || "—"} mono />
            <InfoRow label="Catching Up" value={data?.syncInfo?.catching_up ? "Yes" : "No"} />
            <InfoRow label="Earliest Block" value={Number(data?.syncInfo?.earliest_block_height || 0).toLocaleString()} />
          </div>
        </Card>
      </div>

      {/* Validator Votes */}
      {data?.currentVoteSet && data?.prevotes?.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle title={`Round ${data.currentVoteSet.round} Votes`} sub="Validator prevotes" />
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1"><Circle className="w-2 h-2 text-emerald-400 fill-emerald-400" /> Voted</span>
              <span className="flex items-center gap-1"><Circle className="w-2 h-2 text-red-500 fill-red-500" /> Missed</span>
              <span className="flex items-center gap-1"><Circle className="w-2 h-2 text-amber-500 fill-amber-500" /> Proposer</span>
            </div>
          </div>
          <div className="text-xs font-mono break-all mb-3 text-muted-foreground bg-muted/30 p-3 rounded-xl">
            {data.currentVoteSet.prevotes_bit_array}
          </div>
          <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
            {data.prevotes.map((vote: string, idx: number) => {
              const isNil = vote?.toLowerCase() === "nil-vote";
              const isProposer = idx === data.proposerIndex;
              const v = data.dumpValidators?.[idx];
              const pk = v?.pub_key?.value;
              let name = v?.address?.slice(0, 12) + "..." || `Val ${idx}`;
              if (pk && data.validatorMap[pk]) name = data.validatorMap[pk];

              let bg = "bg-muted/50 border-border/30";
              if (!isNil) bg = "bg-emerald-500/20 border-emerald-500/30";
              else if (isProposer) bg = "bg-amber-500/20 border-amber-500/30";
              else bg = "bg-red-500/10 border-red-500/20";

              return (
                <div key={idx} className={`${bg} border rounded-xl px-3 py-2 text-xs font-medium min-w-[130px]`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{name}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${!isNil ? 'bg-emerald-400' : 'bg-red-400'} ${isProposer ? 'ring-2 ring-amber-400' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Peers */}
      {data?.peers?.length > 0 && (
        <Card>
          <SectionTitle title={`Peers (${data.peers.length})`} sub="Connected network peers" icon={<Users className="w-5 h-5 text-cyan-400" />} />
          <div className="max-h-60 overflow-y-auto space-y-1 mt-2">
            {data.peers.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs truncate">{p.node_info?.moniker || "Unknown"}</span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">{p.remote_ip || "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function IndicatorCard({ icon, label, value, sub, live, progress, progressColor }: any) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
        {live && <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      {progress !== undefined && (
        <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, gradient, stepColor }: any) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-bold ${stepColor || ""}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} grid place-items-center shadow-lg`}>{icon}</div>
      </div>
    </div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
