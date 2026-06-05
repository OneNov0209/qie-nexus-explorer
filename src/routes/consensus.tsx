import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { useMemo } from "react";
import {
  Activity, Radio, Zap, Clock, Server,
  Wifi, BarChart3, PieChart, Circle,
  RefreshCw, Network, Award
} from "lucide-react";
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

const COLORS = ["#8B5CF6", "#D946EF", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#14B8A6", "#F97316"];

function ConsensusPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["consensus"],
    refetchInterval: 3000,
    queryFn: async () => {
      const [status, cs, vals] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.consensusState().catch(() => null),
        cosmos.validators().catch(() => ({ validators: [] })),
      ]);

      let dumpData = null;
      try {
        const dumpRes = await fetch(`/api/rpc/dump_consensus_state`).then(r => r.json());
        dumpData = dumpRes?.result?.round_state;
      } catch {}

      const roundState = cs?.round_state ?? {};
      const [height, round, step] = String(roundState["height/round/step"] ?? "").split("/");

      return {
        roundState,
        height: height || "—",
        round: round || "—",
        step: step || "0",
        dumpData,
        validators: vals?.validators ?? [],
      };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const roundState = data?.roundState;
  const height = data?.height || "—";
  const round = data?.round || "—";
  const step = data?.step || "0";
  const stepInfo = STEP_INFO[step] || { name: `Step ${step}`, icon: Activity, color: "text-muted-foreground" };
  const StepIcon = stepInfo.icon;

  const dumpValidators = data?.dumpData?.validators?.validators || [];
  const currentVoteSet = roundState?.height_vote_set?.[0];
  const prevotes: string[] = currentVoteSet?.prevotes || [];
  const precommits: string[] = currentVoteSet?.precommits || [];
  const proposerIndex = Number(roundState?.proposer?.index ?? 0);

  const activePrevotes = prevotes.filter((v: string) => v?.toLowerCase() !== "nil-vote").length;
  const activePrecommits = precommits.filter((v: string) => v?.toLowerCase() !== "nil-vote").length;
  const totalValidators = dumpValidators.length || prevotes.length || 1;
  const onboardRate = totalValidators > 0 ? Math.round((activePrevotes / totalValidators) * 100) : 0;

  const validatorMap = useMemo(() => {
    const map = new Map<string, string>();
    (data?.validators || []).forEach((v: any) => {
      if (v.consensus_pubkey?.key) {
        map.set(v.consensus_pubkey.key, v.description?.moniker || shorten(v.operator_address, 8, 6));
      }
    });
    return map;
  }, [data?.validators]);

  const votingPowerData = useMemo(() => {
    if (!dumpValidators.length) return [];
    const top = dumpValidators.slice(0, 10).map((v: any) => ({
      name: validatorMap.get(v?.pub_key?.value) || v?.address?.slice(0, 10) || "Unknown",
      power: parseInt(v?.voting_power || "0"),
    })).sort((a, b) => b.power - a.power);
    const otherPower = dumpValidators.slice(10).reduce((s: number, v: any) => s + parseInt(v?.voting_power || "0"), 0);
    if (otherPower > 0) top.push({ name: "Others", power: otherPower });
    return top;
  }, [dumpValidators, validatorMap]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SectionTitle title="Consensus State" sub="Live real-time monitoring · Update every 3s" icon={<Network className="w-5 h-5 text-violet-500" />} />
        <button onClick={() => refetch()} disabled={isFetching}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Onboard Rate" value={`${onboardRate}%`} icon={<Radio className="w-5 h-5 text-white" />} gradient="from-rose-500 to-red-500" />
        <StatCard label="Block Height" value={Number(height).toLocaleString()} icon={<Server className="w-5 h-5 text-white" />} gradient="from-emerald-500 to-teal-500" />
        <StatCard label="Round" value={round} icon={<Zap className="w-5 h-5 text-white" />} gradient="from-violet-500 to-purple-500" />
        <StatCard label="Step" value={stepInfo.name} icon={<StepIcon className="w-5 h-5 text-white" />} gradient="from-blue-500 to-cyan-500" stepColor={stepInfo.color} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IndicatorCard icon={<Wifi className="w-4 h-4 text-emerald-400" />} label="Network Sync" value={Number(height).toLocaleString()} sub="Latest Block" live />
        <IndicatorCard icon={<Activity className="w-4 h-4 text-blue-400" />} label="Active Validators" value={`${activePrevotes} / ${totalValidators}`} progress={onboardRate} progressColor="from-emerald-400 to-blue-500" />
        <IndicatorCard icon={<Clock className="w-4 h-4 text-violet-400" />} label="Last Update" value={new Date().toLocaleTimeString()} sub="Every 3 seconds" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle title="Voting Power Distribution" icon={<BarChart3 className="w-5 h-5 text-violet-400" />} />
          <div className="h-64">
            {votingPowerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={votingPowerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={70} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="power" radius={[0, 4, 4, 0]}>
                    {votingPowerData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No validator data</div>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Live Voting Status" icon={<Activity className="w-5 h-5 text-emerald-400" />} />
          <div className="space-y-4 mt-2">
            <ProgressBar label="Prevotes" value={activePrevotes} total={totalValidators} color="from-amber-500 to-yellow-500" />
            <ProgressBar label="Precommits" value={activePrecommits} total={totalValidators} color="from-emerald-500 to-green-500" />
            <ProgressBar label="Consensus Progress" value={onboardRate} total={100} color="from-blue-500 to-violet-500" unit="%" />
          </div>
        </Card>
      </div>

      {currentVoteSet && prevotes.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle title={`Round ${currentVoteSet.round}`} sub="Validator votes" />
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1"><Circle className="w-2 h-2 text-emerald-400 fill-emerald-400" /> Voted</span>
              <span className="flex items-center gap-1"><Circle className="w-2 h-2 text-red-500 fill-red-500" /> Missed</span>
              <span className="flex items-center gap-1"><Circle className="w-2 h-2 text-amber-500 fill-amber-500" /> Proposer</span>
            </div>
          </div>
          <div className="text-xs font-mono break-all mb-3 text-muted-foreground bg-muted/30 p-3 rounded-xl">
            {currentVoteSet.prevotes_bit_array}
          </div>
          <div className="flex flex-wrap gap-2 max-h-[500px] overflow-y-auto">
            {prevotes.map((vote: string, idx: number) => {
              const isNil = vote?.toLowerCase() === "nil-vote";
              const isProposer = idx === proposerIndex;
              const v = dumpValidators[idx];
              const pk = v?.pub_key?.value;
              let name = v?.address?.slice(0, 12) + "..." || `Val ${idx}`;
              if (pk && validatorMap.has(pk)) name = validatorMap.get(pk)!;

              let bg = "bg-muted/50 border-border/30";
              if (!isNil) bg = "bg-emerald-500/20 border-emerald-500/30";
              else if (isProposer) bg = "bg-amber-500/20 border-amber-500/30";
              else bg = "bg-red-500/10 border-red-500/20";

              return (
                <div key={idx} className={`${bg} border rounded-xl px-3 py-2 text-xs font-medium min-w-[120px]`}>
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
    </div>
  );
}

function ProgressBar({ label, value, total, color, unit }: { label: string; value: number; total: number; color: string; unit?: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}{unit || ` / ${total}`}</span></div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-300`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
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
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-all group overflow-hidden relative">
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
