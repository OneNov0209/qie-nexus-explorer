import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { useState, useMemo } from "react";
import {
  Activity, Users, Radio, Zap, Clock, Server,
  Wifi, TrendingUp, BarChart3, PieChart, Circle,
  RefreshCw, Network, Award, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";

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
  const [voteHistory, setVoteHistory] = useState<{ time: string; voted: number; total: number }[]>([]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["consensus"],
    refetchInterval: 3000,
    queryFn: async () => {
      const [status, net, cs, vals, dumpRes] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.netInfo().catch(() => null),
        cosmos.consensusState().catch(() => null),
        cosmos.validators().catch(() => ({ validators: [] })),
        fetch(`${NETWORK.rpc}/dump_consensus_state`).then(r => r.json()).catch(() => null),
      ]);

      const roundState = cs?.round_state ?? {};
      const [height, round, step] = String(roundState["height/round/step"] ?? "").split("/");

      return {
        status,
        net,
        cs,
        roundState,
        height,
        round,
        step: step || "0",
        dumpData: dumpRes?.result?.round_state,
        validators: vals?.validators ?? [],
        syncInfo: status?.sync_info,
        nodeInfo: status?.node_info,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState error={error} />;

  const roundState = data?.roundState;
  const height = data?.height || "—";
  const round = data?.round || "—";
  const step = data?.step || "0";
  const stepInfo = STEP_INFO[step] || { name: `Step ${step}`, icon: Activity, color: "text-muted-foreground" };
  const StepIcon = stepInfo.icon;

  const dumpValidators = data?.dumpData?.validators?.validators || [];
  const currentVoteSet = roundState?.height_vote_set?.[0];
  const prevotes = currentVoteSet?.prevotes || [];
  const precommits = currentVoteSet?.precommits || [];
  const proposerIndex = roundState?.proposer?.index ?? 0;

  const activePrevotes = prevotes.filter((v: string) => v?.toLowerCase() !== "nil-vote").length;
  const activePrecommits = precommits.filter((v: string) => v?.toLowerCase() !== "nil-vote").length;
  const totalValidators = dumpValidators.length || prevotes.length || 1;

  const validatorMap = useMemo(() => {
    const map = new Map<string, string>();
    (data?.validators || []).forEach((v: any) => {
      if (v.consensus_pubkey?.key) {
        map.set(v.consensus_pubkey.key, v.description?.moniker || shorten(v.operator_address, 8, 6));
      }
    });
    return map;
  }, [data?.validators]);

  // Calculate onboard rate
  const onboardRate = useMemo(() => {
    let maxRate = 0;
    const voteSets = roundState?.height_vote_set || [];
    for (const voteSet of voteSets) {
      const bitArray = voteSet.prevotes_bit_array || "";
      const match = bitArray.match(/(\d+)\/(\d+)/);
      if (match) {
        const voted = parseInt(match[1]);
        const tot = parseInt(match[2]);
        if (tot > 0) maxRate = Math.max(maxRate, (voted / tot) * 100);
      }
    }
    return totalValidators > 0 ? Math.round((activePrevotes / totalValidators) * 100) : Math.round(maxRate);
  }, [roundState, activePrevotes, totalValidators]);

  // Vote history for chart
  useMemo(() => {
    if (totalValidators > 0) {
      const timeStr = new Date().toLocaleTimeString();
      setVoteHistory(prev => {
        const newHistory = [...prev, { time: timeStr, voted: activePrevotes, total: totalValidators }];
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
    }
  }, [activePrevotes, totalValidators]);

  const voteChartData = voteHistory.map(h => ({
    time: h.time,
    voted: h.voted,
    missed: h.total - h.voted,
  }));

  const votingPowerData = useMemo(() => {
    const top = dumpValidators.slice(0, 10).map((v: any) => ({
      name: validatorMap.get(v?.pub_key?.value) || v?.address?.slice(0, 10) || "Unknown",
      power: parseInt(v?.voting_power || "0"),
    })).sort((a: any, b: any) => b.power - a.power);
    const otherPower = dumpValidators.slice(10).reduce((sum: number, v: any) => sum + parseInt(v?.voting_power || "0"), 0);
    if (otherPower > 0) top.push({ name: "Others", power: otherPower });
    return top;
  }, [dumpValidators, validatorMap]);

  const stepDistribution = [
    { name: "Prevotes", value: activePrevotes, fill: "#F59E0B" },
    { name: "Missed Prev.", value: totalValidators - activePrevotes, fill: "#EF4444" },
    { name: "Precommits", value: activePrecommits, fill: "#10B981" },
    { name: "Missed Precom.", value: totalValidators - activePrecommits, fill: "#EF4444" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SectionTitle
          title="Consensus State"
          sub="Live real-time monitoring · Update every 3s"
          icon={<Network className="w-5 h-5 text-violet-500" />}
        />
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Onboard Rate" value={`${onboardRate}%`} icon={<Radio className="w-5 h-5 text-white" />} gradient="from-rose-500 to-red-500" />
        <StatCard label="Block Height" value={Number(height).toLocaleString()} icon={<Server className="w-5 h-5 text-white" />} gradient="from-emerald-500 to-teal-500" />
        <StatCard label="Round" value={round} icon={<Zap className="w-5 h-5 text-white" />} gradient="from-violet-500 to-purple-500" />
        <StatCard label="Step" value={stepInfo.name} icon={<StepIcon className="w-5 h-5 text-white" />} gradient="from-blue-500 to-cyan-500" stepColor={stepInfo.color} />
      </div>

      {/* Live Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Wifi className="w-4 h-4 text-emerald-400" /><span className="text-xs text-muted-foreground">Network Sync</span></div>
            <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>
          </div>
          <p className="text-2xl font-bold mt-2">{Number(height).toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">Latest Block</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-blue-400" /><span className="text-xs text-muted-foreground">Active Validators</span></div>
          <div className="flex items-baseline gap-2"><span className="text-2xl font-bold">{activePrevotes}</span><span className="text-sm text-muted-foreground">/ {totalValidators}</span></div>
          <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full transition-all duration-300" style={{ width: `${totalValidators > 0 ? (activePrevotes / totalValidators) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-violet-400" /><span className="text-xs text-muted-foreground">Last Update</span></div>
          <p className="text-xl font-mono font-bold">{new Date().toLocaleTimeString()}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Every 3 seconds</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle title="Vote History" sub="Last 20 updates" icon={<TrendingUp className="w-5 h-5 text-blue-400" />} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={voteChartData}>
                <defs>
                  <linearGradient id="votedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="missedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Area type="monotone" dataKey="voted" stroke="#10b981" fill="url(#votedGrad)" name="Voted" />
                <Area type="monotone" dataKey="missed" stroke="#ef4444" fill="url(#missedGrad)" name="Missed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Top Validators by Power" icon={<BarChart3 className="w-5 h-5 text-violet-400" />} />
          <div className="h-64">
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
          </div>
        </Card>
      </div>

      {/* Pie Chart + Live Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle title="Vote Distribution" icon={<PieChart className="w-5 h-5 text-pink-400" />} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={stepDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
                  {stepDistribution.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Live Voting Status */}
        <Card>
          <SectionTitle title="Live Voting Status" icon={<Activity className="w-5 h-5 text-emerald-400" />} />
          <div className="space-y-4 mt-2">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Prevotes</span><span className="font-medium">{activePrevotes} / {totalValidators}</span></div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all" style={{ width: `${totalValidators > 0 ? (activePrevotes / totalValidators) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Precommits</span><span className="font-medium">{activePrecommits} / {totalValidators}</span></div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all" style={{ width: `${totalValidators > 0 ? (activePrecommits / totalValidators) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Consensus Progress</span><span className="font-medium">{onboardRate}%</span></div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all" style={{ width: `${onboardRate}%` }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Validator Vote Grid */}
      {currentVoteSet && (
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
              const isNilVote = vote?.toLowerCase() === "nil-vote";
              const isProposer = idx === proposerIndex;
              const validator = dumpValidators[idx];
              const pubkeyBase64 = validator?.pub_key?.value;
              let displayName = validator?.address?.slice(0, 12) + "..." || `Val ${idx}`;
              if (pubkeyBase64 && validatorMap.has(pubkeyBase64)) {
                displayName = validatorMap.get(pubkeyBase64)!;
              }

              let bgClass = "bg-muted/50";
              if (!isNilVote) bgClass = "bg-emerald-500/20 border-emerald-500/30";
              if (isNilVote && isProposer) bgClass = "bg-amber-500/20 border-amber-500/30";
              if (isNilVote && !isProposer) bgClass = "bg-red-500/10 border-red-500/20";

              return (
                <div key={idx} className={`${bgClass} border rounded-xl px-3 py-2 text-xs font-medium min-w-[120px]`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{displayName}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${!isNilVote ? 'bg-emerald-400' : 'bg-red-400'} ${isProposer ? 'ring-2 ring-amber-400' : ''}`} />
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

function StatCard({ label, value, icon, gradient, stepColor }: {
  label: string; value: string; icon: React.ReactNode; gradient: string; stepColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-all group overflow-hidden relative">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-bold ${stepColor || ""}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} grid place-items-center shadow-lg`}>
          {icon}
        </div>
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
