import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos } from "@/lib/api";
import { Card, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blocks/$height")({
  head: ({ params }) => ({ meta: [{ title: `Block #${params.height} — QIE Explorer` }] }),
  component: BlockDetail,
});

function BlockDetail() {
  const { height } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["block", height],
    queryFn: async () => {
      const [block, txs] = await Promise.all([
        cosmos.block(height),
        cosmos.txsByHeight(Number(height)).catch(() => ({ txs: [], tx_responses: [] })),
      ]);
      return { block, txs };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const h = data?.block?.block?.header;

  return (
    <div className="space-y-6">
      <Link to="/blocks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Back to blocks
      </Link>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Block <span className="gradient-text">#{Number(h?.height).toLocaleString()}</span></h1>
          <Pill variant="success">Finalized</Pill>
        </div>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm">
          <Row label="Time" value={dayjs(h?.time).format("YYYY-MM-DD HH:mm:ss")} />
          <Row label="Chain ID" value={h?.chain_id} />
          <Row label="Proposer" value={h?.proposer_address} mono />
          <Row label="Hash" value={data?.block?.block_id?.hash} mono />
          <Row label="App hash" value={h?.app_hash} mono />
          <Row label="Last commit" value={h?.last_commit_hash} mono />
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Transactions ({data?.txs?.tx_responses?.length ?? 0})</h2>
        <div className="space-y-2">
          {(data?.txs?.tx_responses ?? []).map((t: any) => (
            <Link key={t.txhash} to="/tx/$hash" params={{ hash: t.txhash }} className="flex justify-between p-3 rounded-xl hover:bg-white/5">
              <div className="font-mono text-xs text-primary truncate max-w-[60%]">{t.txhash}</div>
              <div className="text-xs">{t.code === 0 ? <Pill variant="success">Success</Pill> : <Pill variant="danger">Fail</Pill>}</div>
            </Link>
          ))}
          {(data?.txs?.tx_responses ?? []).length === 0 && <div className="text-sm text-muted-foreground">No transactions in this block.</div>}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : "text-sm"}>{value ?? "—"}</dd>
    </div>
  );
}
