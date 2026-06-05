import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { evmRpc, hexToNum, formatWei, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { ArrowLeft, Hash, Boxes, Clock, Fuel, User, FileText, Coins, ArrowRightLeft, CheckCircle, XCircle, Copy } from "lucide-react";
import dayjs from "dayjs";
import { NETWORK } from "@/data/network";
import { useState } from "react";

export const Route = createFileRoute("/tx/$hash")({
  head: ({ params }) => ({ meta: [{ title: `Tx ${params.hash.slice(0, 10)}... — QIE Explorer` }] }),
  component: TxDetail,
});

function TxDetail() {
  const { hash } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["tx", hash],
    queryFn: async () => {
      const [tx, receipt] = await Promise.all([
        evmRpc<any>("eth_getTransactionByHash", [hash]),
        evmRpc<any>("eth_getTransactionReceipt", [hash]),
      ]);
      return { tx, receipt };
    },
  });

  if (isLoading) return <Loading />;
  if (error || !data?.tx) return <ErrorState error={error || "Transaction not found"} />;

  const tx = data.tx;
  const receipt = data.receipt;
  const isSuccess = receipt?.status === "0x1";
  const valueEth = tx.value ? Number(BigInt(tx.value)) / 1e18 : 0;
  const gasUsed = receipt?.gasUsed ? hexToNum(receipt.gasUsed) : 0;
  const gasPrice = tx.gasPrice ? Number(BigInt(tx.gasPrice)) / 1e9 : 0;
  const gasLimit = tx.gas ? hexToNum(tx.gas) : 0;
  const txfee = gasUsed * gasPrice / 1e9;
  const blockNum = tx.blockNumber ? hexToNum(tx.blockNumber) : null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/transactions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-500 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-cyan-500" />
          Transaction
        </h1>
        {isSuccess ? (
          <Pill variant="success" className="ml-auto flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Success
          </Pill>
        ) : (
          <Pill variant="danger" className="ml-auto flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </Pill>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard icon={<Coins className="w-4 h-4 text-amber-400" />} label="Value" value={`${valueEth.toFixed(4)} ${NETWORK.symbol}`} />
        <InfoCard icon={<Fuel className="w-4 h-4 text-emerald-400" />} label="Tx Fee" value={`${txfee.toFixed(6)} ${NETWORK.symbol}`} sub={`${gasUsed.toLocaleString()} gas`} />
        <InfoCard icon={<Boxes className="w-4 h-4 text-violet-400" />} label="Block" value={blockNum ? `#${blockNum.toLocaleString()}` : "Pending"} />
        <InfoCard icon={<Clock className="w-4 h-4 text-cyan-400" />} label="Status" value={isSuccess ? "Confirmed" : "Failed"} />
      </div>

      {/* Transaction Details */}
      <Card>
        <SectionTitle title="Transaction Details" icon={<FileText className="w-5 h-5 text-cyan-500" />} />
        <div className="space-y-3 mt-2">
          <DetailRow label="Transaction Hash" value={tx.hash} mono copy />
          <DetailRow label="Block Number" value={blockNum?.toLocaleString()} mono link={blockNum ? `/blocks/${blockNum}` : undefined} />
          <DetailRow label="From" value={tx.from} mono />
          <DetailRow label="To" value={tx.to || "Contract Creation"} mono />
          <DetailRow label="Value" value={`${valueEth.toFixed(6)} ${NETWORK.symbol}`} />
          <DetailRow label="Gas Price" value={`${gasPrice.toFixed(2)} Gwei`} />
          <DetailRow label="Gas Limit" value={gasLimit.toLocaleString()} />
          <DetailRow label="Gas Used" value={receipt ? `${gasUsed.toLocaleString()} (${gasLimit > 0 ? ((gasUsed / gasLimit) * 100).toFixed(1) : 0}%)` : "Pending"} />
          <DetailRow label="Nonce" value={tx.nonce ? hexToNum(tx.nonce).toString() : "—"} />
          <DetailRow label="Input Data" value={tx.input && tx.input !== "0x" ? tx.input : "—"} mono />
          {receipt?.contractAddress && (
            <DetailRow label="Contract Created" value={receipt.contractAddress} mono />
          )}
        </div>
      </Card>

      {/* Logs */}
      {receipt?.logs && receipt.logs.length > 0 && (
        <Card>
          <SectionTitle title="Event Logs" sub={`${receipt.logs.length} events`} icon={<FileText className="w-5 h-5 text-violet-500" />} />
          <div className="space-y-2 mt-2">
            {receipt.logs.slice(0, 10).map((log: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded">Log {i}</span>
                  <span className="text-[11px] text-muted-foreground">Address: {shorten(log.address, 10, 8)}</span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground/60 break-all">
                  Topics: {log.topics?.length ?? 0}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground/40 break-all mt-1">
                  Data: {log.data?.slice(0, 100)}{log.data?.length > 100 ? "..." : ""}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-cyan-500/20 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-bold text-lg">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function DetailRow({ label, value, mono, copy, link }: { label: string; value?: string; mono?: boolean; copy?: boolean; link?: string }) {
  const [copied, setCopied] = useState(false);
  const display = value ?? "—";

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 border-b border-border/30 last:border-0">
      <dt className="text-xs text-muted-foreground uppercase tracking-wider sm:w-44 shrink-0">{label}</dt>
      <dd className={`text-sm break-all flex-1 ${mono ? "font-mono text-xs" : ""}`}>
        {link ? (
          <Link to={link as any} className="text-violet-400 hover:text-violet-300 transition-colors">
            {display}
          </Link>
        ) : (
          display
        )}
      </dd>
      {copy && value && (
        <button onClick={handleCopy} className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors shrink-0">
          {copied ? "Copied!" : "Copy"}
        </button>
      )}
    </div>
  );
}
