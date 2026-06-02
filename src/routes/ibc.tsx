import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos } from "@/lib/api";
import { Card, SectionTitle, StatCard, Loading, ErrorState, Pill } from "@/components/ui/primitives";

export const Route = createFileRoute("/ibc")({
  head: () => ({ meta: [{ title: "IBC — QIE Explorer" }] }),
  component: IBCPage,
});

function IBCPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ibc"], refetchInterval: 60_000,
    queryFn: async () => {
      const [channels, conns, clients] = await Promise.all([
        cosmos.ibcChannels().catch(() => ({ channels: [] })),
        cosmos.ibcConnections().catch(() => ({ connections: [] })),
        cosmos.ibcClients().catch(() => ({ client_states: [] })),
      ]);
      return { channels: channels.channels ?? [], conns: conns.connections ?? [], clients: clients.client_states ?? [] };
    },
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <div className="space-y-6">
      <SectionTitle title="IBC" sub="Inter-Blockchain Communication" />
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Channels" value={data?.channels.length ?? 0} accent />
        <StatCard label="Connections" value={data?.conns.length ?? 0} />
        <StatCard label="Clients" value={data?.clients.length ?? 0} />
      </div>
      <Card>
        <h3 className="font-semibold mb-3">Channels</h3>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {data?.channels.map((c: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-xs">
              <div>
                <div className="font-mono">{c.channel_id} · {c.port_id}</div>
                <div className="text-muted-foreground">Counterparty: {c.counterparty?.channel_id}</div>
              </div>
              <Pill variant={c.state === "STATE_OPEN" ? "success" : "warning"}>{c.state}</Pill>
            </div>
          ))}
          {data?.channels.length === 0 && <div className="text-sm text-muted-foreground">No IBC channels yet.</div>}
        </div>
      </Card>
    </div>
  );
}
