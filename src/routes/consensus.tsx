import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos } from "@/lib/api";
import { Card, SectionTitle, StatCard, Loading, ErrorState } from "@/components/ui/primitives";

export const Route = createFileRoute("/consensus")({
  head: () => ({ meta: [{ title: "Consensus — QIE Explorer" }] }),
  component: ConsensusPage,
});

function ConsensusPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["consensus"], refetchInterval: 5000,
    queryFn: async () => {
      const [status, net, cs] = await Promise.all([
        cosmos.status(), cosmos.netInfo(), cosmos.consensusState(),
      ]);
      return { status, net, cs };
    },
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const rs = data?.cs?.round_state ?? {};
  const [height, round, step] = String(rs["height/round/step"] ?? "").split("/");

  return (
    <div className="space-y-6">
      <SectionTitle title="Consensus & Peers" sub="Live Tendermint state" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Height" value={Number(height ?? 0).toLocaleString()} accent />
        <StatCard label="Round" value={round ?? "—"} />
        <StatCard label="Step" value={step ?? "—"} />
        <StatCard label="Peers" value={data?.net?.n_peers ?? 0} />
      </div>
      <Card>
        <h3 className="font-semibold mb-3">Node Info</h3>
        <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">{JSON.stringify(data?.status?.node_info, null, 2)}</pre>
      </Card>
      <Card>
        <h3 className="font-semibold mb-3">Peers ({data?.net?.peers?.length ?? 0})</h3>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {(data?.net?.peers ?? []).map((p: any, i: number) => (
            <div key={i} className="text-xs font-mono p-2 rounded bg-white/5 break-all">
              {p.node_info?.moniker} · {p.remote_ip}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
