import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { evm, hexToNum, formatWei, shorten } from "@/lib/api";
import { Card, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";
import { NETWORK } from "@/data/network";

export const Route = createFileRoute("/blocks/$height")({
  head: ({ params }) => ({ meta: [{ title: `Block #${params.height} — QIE Explorer` }] }),
  component: BlockDetail,
});

function BlockDetail() {
  const { height } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["evm-block", height],
    queryFn: () => evm.getBlock(Number(height), true),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const b = data;
  const num = hexToNum(b?.number);
  const ts = hexToNum(b?.timestamp) * 1000;
  const txs = b?.transactions ?? [];

  return (
    <div className="space-y-6">
      <Link to="/blocks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Back to blocks
      </Link>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Block <span className="gradient-text">#{num.toLocaleString()}</span></h1>
          <Pill variant="success">Finalized</Pill>
        </div>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm">
          <Row label="Time" value={dayjs(ts).format("YYYY-MM-DD HH:mm:ss")} />
          <Row label="Hash" value={b?.hash} mono />
          <Row label="Parent hash" value={b?.parentHash} mono />
          <Row label="Miner" value={b?.miner} mono />
          <Row label="Gas used / limit" value={`${hexToNum(b?.gasUsed).toLocaleString()} / ${hexToNum(b?.gasLimit).toLocaleString()}`} />
          <Row label="Size" value={`${hexToNum(b?.size).toLocaleString()} bytes`} />
          <Row label="Transactions" value={String(txs.length)} />
          <Row label="Base fee" value={b?.baseFeePerGas ? `${formatWei(b.baseFeePerGas, 9)} ${NETWORK.symbol}` : "—"} />
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Transactions ({txs.length})</h2>
        <div className="space-y-2">
          {txs.map((t: any) => {
            const h = typeof t === "string" ? t : t.hash;
            return (
              <Link key={h} to="/tx/$hash" params={{ hash: h }} className="flex justify-between items-center p-3 rounded-xl hover:bg-white/5">
                <div className="font-mono text-xs text-primary truncate max-w-[55%]">{h}</div>
                {typeof t !== "string" && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {shorten(t.from, 8, 4)} → {t.to ? shorten(t.to, 8, 4) : "contract create"}
                  </div>
                )}
              </Link>
            );
          })}
          {txs.length === 0 && <div className="text-sm text-muted-foreground">No transactions in this block.</div>}
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
