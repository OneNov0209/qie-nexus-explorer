import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import dayjs from "dayjs";

export const Route = createFileRoute("/blocks")({
  head: () => ({ meta: [{ title: "Blocks — QIE Explorer" }] }),
  component: BlocksPage,
});

function BlocksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["blocks-list"],
    refetchInterval: 6000,
    queryFn: async () => {
      const status = await cosmos.status();
      const latest = Number(status?.sync_info?.latest_block_height ?? 0);
      const min = Math.max(1, latest - 49);
      const bc = await cosmos.blockchain(min, latest);
      return bc?.block_metas ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <SectionTitle title="Blocks" sub="Latest 50 blocks · auto-refresh" />
      {isLoading ? <Loading /> : error ? <ErrorState error={error} /> : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border/60">
                <tr><th className="text-left p-4">Height</th><th className="text-left p-4">Time</th><th className="text-left p-4">Proposer</th><th className="text-right p-4">Txs</th><th className="text-left p-4">Hash</th></tr>
              </thead>
              <tbody>
                {(data ?? []).map((b: any) => (
                  <tr key={b.header.height} className="border-b border-border/40 hover:bg-white/5">
                    <td className="p-4">
                      <Link to="/blocks/$height" params={{ height: b.header.height }} className="font-mono text-primary hover:underline">
                        {Number(b.header.height).toLocaleString()}
                      </Link>
                    </td>
                    <td className="p-4 text-muted-foreground">{dayjs(b.header.time).format("YYYY-MM-DD HH:mm:ss")}</td>
                    <td className="p-4 font-mono text-xs">{(b.header.proposer_address ?? "").slice(0, 16)}…</td>
                    <td className="p-4 text-right tabular-nums">{b.num_txs ?? 0}</td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{(b.block_id?.hash ?? "").slice(0, 18)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
