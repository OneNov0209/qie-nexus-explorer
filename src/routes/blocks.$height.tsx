import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { evm, hexToNum, formatWei, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { ArrowLeft, Boxes, Clock, Database, Hash, User, Fuel, FileText, ArrowRightLeft, Coins, Gauge, HardDrive, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
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
  const gasUsed = hexToNum(b?.gasUsed);
  const gasLimit = hexToNum(b?.gasLimit);
  const gasPct = gasLimit > 0 ? ((gasUsed / gasLimit) * 100).toFixed(2) : "0";
  const size = hexToNum(b?.size);

  return (
    <div className="space-y-6 pb-8">
      {/* Back + Title */}
      <div className="flex items-center gap-4">
        <Link
          to="/blocks"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-violet-500 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Boxes className="w-6 h-6 text-violet-500" />
          Block
          <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            #{num.toLocaleString()}
          </span>
        </h1>
        <Pill variant="success" className="ml-auto">Finalized</Pill>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <InfoCard
          icon={<Clock className="w-4 h-4 text-cyan-400" />}
          label="Timestamp"
          value={dayjs(ts).format("MMM DD, YYYY")}
          sub={dayjs(ts).format("HH:mm:ss UTC")}
        />
        <InfoCard
          icon={<Database className="w-4 h-4 text-amber-400" />}
          label="Transactions"
          value={txs.length.toString()}
          sub="in this block"
        />
        <InfoCard
          icon={<Fuel className="w-4 h-4 text-emerald-400" />}
          label="Gas Used"
          value={`${gasUsed.toLocaleString()}`}
          sub={`${gasPct}% of ${gasLimit.toLocaleString()}`}
        />
        <InfoCard
          icon={<HardDrive className="w-4 h-4 text-blue-400" />}
          label="Size"
          value={`${size.toLocaleString()} bytes`}
          sub={size > 1024 ? `${(size / 1024).toFixed(1)} KB` : ""}
        />
      </div>

      {/* Block Details */}
      <Card>
        <SectionTitle title="Block Details" icon={<Hash className="w-5 h-5 text-violet-500" />} />
        <div className="space-y-3 mt-2">
          <DetailRow label="Block Hash" value={b?.hash} mono copy />
          <DetailRow label="Parent Hash" value={b?.parentHash} mono />
          <DetailRow label="State Root" value={b?.stateRoot} mono />
          <DetailRow label="Transactions Root" value={b?.transactionsRoot} mono />
          <DetailRow label="Receipts Root" value={b?.receiptsRoot} mono />
          <DetailRow label="Miner / Validator" value={b?.miner} mono />
          <DetailRow label="Difficulty" value={b?.difficulty ? hexToNum(b.difficulty).toLocaleString() : "—"} />
          <DetailRow label="Total Difficulty" value={b?.totalDifficulty ? hexToNum(b.totalDifficulty).toLocaleString() : "—"} />
          <DetailRow label="Nonce" value={b?.nonce} mono />
          <DetailRow label="Extra Data" value={b?.extraData} mono />
          <DetailRow label="Base Fee Per Gas" value={b?.baseFeePerGas ? `${formatWei(b.baseFeePerGas, 9)} ${NETWORK.symbol}` : "—"} />
          <DetailRow label="Mix Hash" value={b?.mixHash} mono />
        </div>
      </Card>

      {/* Transactions */}
      <Card>
        <SectionTitle 
          title={`Transactions`} 
          sub={`${txs.length} transaction${txs.length !== 1 ? "s" : ""} in this block`}
          icon={<ArrowRightLeft className="w-5 h-5 text-cyan-500" />}
        />
        {txs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No transactions in this block</p>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {txs.map((t: any, i: number) => {
              const h = typeof t === "string" ? t : t.hash;
              return (
                <Link
                  key={h}
                  to="/tx/$hash"
                  params={{ hash: h }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/40 hover:border-violet-500/20 hover:bg-violet-500/[0.02] transition-all group"
                >
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 grid place-items-center text-xs font-mono text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-muted-foreground truncate group-hover:text-violet-400 transition-colors">
                      {shorten(h, 12, 10)}
                    </p>
                    {typeof t !== "string" && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-0.5">
                        <span className="font-mono">{shorten(t.from, 6, 4)}</span>
                        <span>→</span>
                        <span className="font-mono">
                          {t.to ? shorten(t.to, 6, 4) : "Contract Create"}
                        </span>
                        {t.value && Number(t.value) > 0 && (
                          <span className="ml-2 text-amber-400 font-medium">{formatWei(t.value, 4)} {NETWORK.symbol}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-violet-400 group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-bold text-lg tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function DetailRow({ label, value, mono, copy }: { label: string; value?: string; mono?: boolean; copy?: boolean }) {
  const display = value ?? "—";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 border-b border-border/30 last:border-0">
      <dt className="text-xs text-muted-foreground uppercase tracking-wider sm:w-40 shrink-0">{label}</dt>
      <dd className={`text-sm break-all flex-1 ${mono ? "font-mono text-xs" : ""}`}>
        {display}
      </dd>
      {copy && value && (
        <button
          onClick={(e) => {
            e.preventDefault();
            navigator.clipboard.writeText(value);
          }}
          className="text-xs text-muted-foreground hover:text-violet-400 transition-colors shrink-0"
          title="Copy to clipboard"
        >
          Copy
        </button>
      )}
    </div>
  );
}
