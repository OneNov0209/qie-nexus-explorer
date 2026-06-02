import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";

export const Route = createFileRoute("/uptime")({
  head: () => ({ meta: [{ title: "Uptime — QIE Explorer" }] }),
  component: UptimePage,
});

function UptimePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["uptime"], refetchInterval: 30_000,
    queryFn: async () => {
      const [signing, params, vals] = await Promise.all([
        cosmos.signingInfos(), cosmos.slashingParams(), cosmos.validators(),
      ]);
      return { signing: signing?.info ?? [], params, vals: vals?.validators ?? [] };
    },
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const window = Number(data?.params?.signed_blocks_window ?? 100);
  const rows = (data?.signing ?? []).map((s: any) => {
    const missed = Number(s.missed_blocks_counter ?? 0);
    const rate = 1 - missed / window;
    return { ...s, rate, missed };
  }).sort((a: any, b: any) => a.rate - b.rate);

  return (
    <div className="space-y-6">
      <SectionTitle title="Validator Uptime" sub={`Signed-blocks window: ${window}`} />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border/60">
            <tr><th className="text-left p-4">Consensus address</th><th className="text-right p-4">Missed</th><th className="text-right p-4">Signing rate</th><th className="text-left p-4">Status</th></tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.address} className="border-b border-border/40 hover:bg-white/5">
                <td className="p-4 font-mono text-xs">{shorten(r.address, 12, 10)}</td>
                <td className="p-4 text-right tabular-nums">{r.missed}</td>
                <td className="p-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.max(0, r.rate * 100)}%` }} />
                    </div>
                    <span className="tabular-nums text-xs">{(r.rate * 100).toFixed(1)}%</span>
                  </div>
                </td>
                <td className="p-4">{r.tombstoned ? <Pill variant="danger">Tombstoned</Pill> : r.missed > window * 0.05 ? <Pill variant="warning">Risky</Pill> : <Pill variant="success">Healthy</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
