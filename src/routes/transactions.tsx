import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import dayjs from "dayjs";
import { NETWORK } from "@/data/network";

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Transactions — QIE Explorer" }] }),
  component: TxPage,
});

function TxPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["recent-txs"],
    refetchInterval: 8000,
    queryFn: async () => {
      const status = await cosmos.status();
      const latest = Number(status?.sync_info?.latest_block_height ?? 0);
      // Scan last 30 blocks for tx
      const results: any[] = [];
      for (let h = latest; h > Math.max(1, latest - 30) && results.length < 30; h--) {
        try {
          const r = await cosmos.txsByHeight(h);
          (r.tx_responses ?? []).forEach((t: any) => results.push(t));
        } catch {}
      }
      return results;
    },
  });

  return (
    <div className="space-y-6">
      <SectionTitle title="Transactions" sub="Recent transactions across the last 30 blocks" />
      {isLoading ? <Loading /> : error ? <ErrorState error={error} /> : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border/60">
                <tr><th className="text-left p-4">Hash</th><th className="text-left p-4">Height</th><th className="text-left p-4">Type</th><th className="text-right p-4">Fee</th><th className="text-left p-4">Time</th><th className="text-left p-4">Status</th></tr>
              </thead>
              <tbody>
                {(data ?? []).map((t: any) => {
                  const type = t.tx?.body?.messages?.[0]?.["@type"]?.split(".").pop() ?? "—";
                  const fee = t.tx?.auth_info?.fee?.amount?.[0]?.amount;
                  return (
                    <tr key={t.txhash} className="border-b border-border/40 hover:bg-white/5">
                      <td className="p-4">
                        <Link to="/tx/$hash" params={{ hash: t.txhash }} className="font-mono text-xs text-primary hover:underline">{t.txhash.slice(0, 20)}…</Link>
                      </td>
                      <td className="p-4 font-mono">{Number(t.height).toLocaleString()}</td>
                      <td className="p-4 text-xs"><Pill>{type}</Pill></td>
                      <td className="p-4 text-right text-xs tabular-nums">{fee ? `${formatQIE(fee)} ${NETWORK.symbol}` : "—"}</td>
                      <td className="p-4 text-xs text-muted-foreground">{dayjs(t.timestamp).format("HH:mm:ss")}</td>
                      <td className="p-4">{t.code === 0 ? <Pill variant="success">Success</Pill> : <Pill variant="danger">Failed</Pill>}</td>
                    </tr>
                  );
                })}
                {(data ?? []).length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No recent transactions.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
