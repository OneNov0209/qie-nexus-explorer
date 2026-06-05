import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { Activity, Radio, Zap, Clock, Server, Wifi, RefreshCw, Network, Award } from "lucide-react";

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
    queryKey: ["consensus-simple"],
    refetchInterval: 5000,
    queryFn: async () => {
      const [status, cs] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.consensusState().catch(() => null),
      ]);
      const roundState = cs?.round_state ?? {};
      const [height, round, step] = String(roundState["height/round/step"] ?? "").split("/");
      return {
        height: height || "—",
        round: round || "—",
        step: step || "0",
        startTime: roundState?.start_time,
        proposer: roundState?.proposer?.address,
        proposerIndex: roundState?.proposer?.index,
        nodeInfo: status?.node_info,
        syncInfo: status?.sync_info,
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
      <div className="flex items-center justify-between gap-3">
        <SectionTitle title="Consensus State" sub="Live Tendermint consensus monitoring" icon={<Network className="w-5 h-5 text-violet-500" />} />
        <button onClick={() => refetch()} disabled={isFetching}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Block Height" value={Number(data?.height).toLocaleString()} icon={<Server className="w-5 h-5 text-white" />} gradient="from-emerald-500 to-teal-500" />
        <StatCard label="Round" value={data?.round || "—"} icon={<Zap className="w-5 h-5 text-white" />} gradient="from-violet-500 to-purple-500" />
        <StatCard label="Step" value={stepInfo.name} icon={<StepIcon className="w-5 h-5 text-white" />} gradient="from-blue-500 to-cyan-500" stepColor={stepInfo.color} />
        <StatCard label="Latest Block" value={Number(data?.syncInfo?.latest_block_height || 0).toLocaleString()} icon={<Activity className="w-5 h-5 text-white" />} gradient="from-rose-500 to-red-500" />
      </div>

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
            <InfoRow label="Latest App Hash" value={data?.syncInfo?.latest_app_hash?.slice(0, 20) + "..." || "—"} mono />
            <InfoRow label="Catching Up" value={data?.syncInfo?.catching_up ? "Yes" : "No"} />
            <InfoRow label="Earliest Block" value={Number(data?.syncInfo?.earliest_block_height || 0).toLocaleString()} />
          </div>
        </Card>
      </div>
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

function StatCard({ label, value, icon, gradient, stepColor }: {
  label: string; value: string; icon: React.ReactNode; gradient: string; stepColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-all">
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
