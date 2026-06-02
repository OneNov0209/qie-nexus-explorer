import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE } from "@/lib/api";
import { Card, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";
import { NETWORK } from "@/data/network";

export const Route = createFileRoute("/tx/$hash")({
  head: ({ params }) => ({ meta: [{ title: `Tx ${params.hash.slice(0, 10)} — QIE Explorer` }] }),
  component: TxDetail,
});

function TxDetail() {
  const { hash } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["tx", hash],
    queryFn: () => cosmos.txByHash(hash),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const r = data?.tx_response;
  const msgs = data?.tx?.body?.messages ?? [];
  const fee = data?.tx?.auth_info?.fee?.amount?.[0]?.amount;

  return (
    <div className="space-y-6">
      <Link to="/transactions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Transaction</h1>
          {r?.code === 0 ? <Pill variant="success">Success</Pill> : <Pill variant="danger">Failed</Pill>}
        </div>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm">
          <Row label="Hash" value={r?.txhash} mono />
          <Row label="Block" value={r?.height} mono />
          <Row label="Time" value={dayjs(r?.timestamp).format("YYYY-MM-DD HH:mm:ss")} />
          <Row label="Gas used / wanted" value={`${r?.gas_used} / ${r?.gas_wanted}`} />
          <Row label="Fee" value={fee ? `${formatQIE(fee)} ${NETWORK.symbol}` : "—"} />
          <Row label="Memo" value={data?.tx?.body?.memo || "—"} />
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Messages ({msgs.length})</h2>
        <div className="space-y-3">
          {msgs.map((m: any, i: number) => (
            <div key={i} className="p-3 rounded-xl bg-white/5">
              <Pill>{m["@type"]?.split(".").pop()}</Pill>
              <pre className="mt-2 text-xs font-mono text-muted-foreground overflow-x-auto">{JSON.stringify(m, null, 2)}</pre>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: any; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : "text-sm"}>{value ?? "—"}</dd>
    </div>
  );
}
