import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { evm, hexToNum, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import dayjs from "dayjs";

export const Route = createFileRoute("/blocks")({
  head: () => ({ meta: [{ title: "Blocks — QIE Explorer" }] }),
  component: BlocksPage,
});

function BlocksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["blocks-list-evm"],
    refetchInterval: 6000,
    queryFn: async () => {
      const latest = await evm.blockNumber();
      const count = 50;
      const start = Math.max(0, latest - count + 1);
      const heights = Array.from({ length: latest - start + 1 }, (_, i) => latest - i);
      const blocks = await Promise.all(heights.map((h) => evm.getBlock(h, false).catch(() => null)));
      return blocks.filter(Boolean);
    },
  });

  return (
    <div className="space-y-6">
      <SectionTitle title="Blocks" sub="Latest 50 blocks · EVM RPC · auto-refresh" />
      {isLoading ? <Loading /> : error ? <ErrorState error={error} /> : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="text-left p-4">Height</th>
                  <th className="text-left p-4">Time</th>
                  <th className="text-left p-4">Miner</th>
                  <th className="text-right p-4">Txs</th>
                  <th className="text-left p-4">Hash</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((b: any) => {
                  const height = hexToNum(b.number);
                  const ts = hexToNum(b.timestamp) * 1000;
                  return (
                    <tr key={b.hash} className="border-b border-border/40 hover:bg-white/5">
                      <td className="p-4">
                        <Link to="/blocks/$height" params={{ height: String(height) }} className="font-mono text-primary hover:underline">
                          {height.toLocaleString()}
                        </Link>
                      </td>
                      <td className="p-4 text-muted-foreground">{dayjs(ts).format("YYYY-MM-DD HH:mm:ss")}</td>
                      <td className="p-4 font-mono text-xs">{shorten(b.miner, 10, 6)}</td>
                      <td className="p-4 text-right tabular-nums">{b.transactions?.length ?? 0}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">{shorten(b.hash, 12, 8)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
