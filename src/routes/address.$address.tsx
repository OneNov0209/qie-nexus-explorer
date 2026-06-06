import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten, evmRpc } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { useState } from "react";
import {
  ArrowLeft, User, Wallet, Coins, Layers, Gift, Clock,
  FileText, Key, ExternalLink, Copy, Check, Activity,
  ArrowRightLeft, Database
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export const Route = createFileRoute("/address/$address")({
  head: ({ params }) => ({ meta: [{ title: `Address ${shorten(params.address)} — QIE Explorer` }] }),
  component: AddressDetail,
});

function AddressDetail() {
  const { address } = Route.useParams();
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["address-detail", address],
    refetchInterval: 15_000,
    queryFn: async () => {
      const isEvm = address.startsWith("0x");
      const isCosmos = address.startsWith("qie") || address.startsWith("qievaloper");
      const isValidator = address.startsWith("qievaloper");

      let accountInfo: any = null;
      let balance: any[] = [];
      let delegations: any[] = [];
      let rewards: any = null;
      let evmBalance: string = "0";
      let evmTxCount: number = 0;
      let isContract: boolean = false;
      let validatorInfo: any = null;

      // Fetch Cosmos data
      if (isCosmos || isValidator) {
        try {
          const [acc, bal, dels, rews] = await Promise.all([
            fetch(`${NETWORK.rest}/cosmos/auth/v1beta1/accounts/${address}`).then(r => r.json()).catch(() => null),
            fetch(`${NETWORK.rest}/cosmos/bank/v1beta1/balances/${address}`).then(r => r.json()).catch(() => ({ balances: [] })),
            fetch(`${NETWORK.rest}/cosmos/staking/v1beta1/delegations/${address}`).then(r => r.json()).catch(() => ({ delegation_responses: [] })),
            fetch(`${NETWORK.rest}/cosmos/distribution/v1beta1/delegators/${address}/rewards`).then(r => r.json()).catch(() => null),
          ]);
          accountInfo = acc?.account;
          balance = bal?.balances ?? [];
          delegations = dels?.delegation_responses ?? [];
          rewards = rews;
        } catch {}
      }

      // Fetch validator info if validator address
      if (isValidator) {
        try {
          validatorInfo = await cosmos.validatorByAddr(address).catch(() => null);
        } catch {}
      }

      // Fetch EVM data
      if (isEvm) {
        try {
          const [bal, txCount, code] = await Promise.all([
            evmRpc<string>("eth_getBalance", [address, "latest"]),
            evmRpc<string>("eth_getTransactionCount", [address, "latest"]),
            evmRpc<string>("eth_getCode", [address, "latest"]),
          ]);
          evmBalance = bal ? (Number(BigInt(bal)) / 1e18).toFixed(6) : "0";
          evmTxCount = txCount ? parseInt(txCount, 16) : 0;
          isContract = code !== "0x";
        } catch {}
      }

      // Fetch Cosmos data for EVM address (may have both)
      if (isEvm) {
        try {
          const bal = await fetch(`${NETWORK.rest}/cosmos/bank/v1beta1/balances/${address}`).then(r => r.json()).catch(() => ({ balances: [] }));
          balance = bal?.balances ?? [];
        } catch {}
      }

      const totalRewards = rewards?.rewards?.reduce((sum: number, r: any) => {
        const qie = r.reward?.find((c: any) => c.denom === NETWORK.denom);
        return sum + Number(qie?.amount ?? 0);
      }, 0) ?? 0;

      return {
        address,
        isEvm,
        isCosmos,
        isValidator,
        isContract,
        accountInfo,
        balance,
        delegations,
        rewards,
        totalRewards,
        evmBalance,
        evmTxCount,
        validatorInfo,
      };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const d = data!;
  const qieBalance = d.balance?.find((b: any) => b.denom === NETWORK.denom)?.amount ?? "0";
  const totalStaked = d.delegations?.reduce((sum: number, del: any) => sum + Number(del.balance?.amount ?? 0), 0) ?? 0;

  function copy(val: string) {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-violet-500 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-full blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${
            d.isContract ? "bg-cyan-500/10" : d.isValidator ? "bg-violet-500/10" : "bg-blue-500/10"
          }`}>
            {d.isContract ? <FileText className="w-7 h-7 text-cyan-400" /> :
             d.isValidator ? <Layers className="w-7 h-7 text-violet-400" /> :
             <Wallet className="w-7 h-7 text-blue-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {d.isContract && <Pill variant="default">Contract</Pill>}
              {d.isValidator && d.validatorInfo && <Pill variant="success">Validator</Pill>}
              {!d.isContract && !d.isValidator && <Pill variant="default">Address</Pill>}
            </div>
            <h1 className="text-lg font-bold font-mono break-all">{d.address}</h1>
            <button onClick={() => copy(d.address)} className="text-xs text-muted-foreground hover:text-violet-400 transition-colors mt-1">
              {copied === d.address ? <Check className="w-3 h-3 inline" /> : <Copy className="w-3 h-3 inline" />} Copy address
            </button>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {d.isEvm && (
          <StatCard label="EVM Balance" value={`${d.evmBalance} ${NETWORK.symbol}`} icon={<Coins className="w-4 h-4 text-amber-400" />} />
        )}
        {Number(qieBalance) > 0 && (
          <StatCard label="Cosmos Balance" value={`${formatQIE(qieBalance, 4)} ${NETWORK.symbol}`} icon={<Wallet className="w-4 h-4 text-emerald-400" />} />
        )}
        {totalStaked > 0 && (
          <StatCard label="Total Staked" value={`${formatQIE(totalStaked, 4)} ${NETWORK.symbol}`} icon={<Layers className="w-4 h-4 text-violet-400" />} />
        )}
        {d.totalRewards > 0 && (
          <StatCard label="Pending Rewards" value={`${formatQIE(d.totalRewards, 6)} ${NETWORK.symbol}`} icon={<Gift className="w-4 h-4 text-pink-400" />} />
        )}
        {d.isEvm && (
          <StatCard label="EVM TX Count" value={d.evmTxCount.toLocaleString()} icon={<Activity className="w-4 h-4 text-blue-400" />} />
        )}
      </div>

      {/* Account Info */}
      {d.accountInfo && (
        <Card>
          <SectionTitle title="Account Info" icon={<Key className="w-5 h-5 text-violet-400" />} />
          <div className="space-y-2 mt-2">
            <InfoRow label="Account Number" value={d.accountInfo.base_account?.account_number ?? d.accountInfo.account_number ?? "—"} />
            <InfoRow label="Sequence" value={d.accountInfo.base_account?.sequence ?? d.accountInfo.sequence ?? "—"} />
            <InfoRow label="Type" value={d.accountInfo["@type"] || "—"} mono />
            {d.accountInfo.base_account?.pub_key?.key && (
              <InfoRow label="Public Key" value={d.accountInfo.base_account.pub_key.key} mono />
            )}
          </div>
        </Card>
      )}

      {/* Delegations */}
      {d.delegations.length > 0 && (
        <Card>
          <SectionTitle title="Delegations" sub={`${d.delegations.length} validator(s)`} icon={<Layers className="w-5 h-5 text-violet-400" />} />
          <div className="space-y-2 mt-2">
            {d.delegations.map((del: any, i: number) => (
              <Link
                key={i}
                to="/staking/$validator"
                params={{ validator: del.delegation?.validator_address }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors"
              >
                <span className="font-mono text-xs text-muted-foreground">{shorten(del.delegation?.validator_address, 12, 10)}</span>
                <span className="text-sm font-medium">{formatQIE(del.balance?.amount ?? "0", 4)} {NETWORK.symbol}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Validator Info */}
      {d.validatorInfo && (
        <Card>
          <SectionTitle title="Validator Info" icon={<Layers className="w-5 h-5 text-violet-400" />} />
          <div className="space-y-2 mt-2">
            <InfoRow label="Moniker" value={d.validatorInfo.description?.moniker || "—"} />
            <InfoRow label="Status" value={d.validatorInfo.status || "—"} />
            <InfoRow label="Tokens" value={formatQIE(d.validatorInfo.tokens ?? "0", 0)} />
            <InfoRow label="Commission" value={`${(Number(d.validatorInfo.commission?.commission_rates?.rate ?? 0) * 100).toFixed(2)}%`} />
            <InfoRow label="Website" value={d.validatorInfo.description?.website || "—"} />
          </div>
        </Card>
      )}

      {/* Balances */}
      {d.balance.length > 0 && (
        <Card>
          <SectionTitle title="All Balances" sub={`${d.balance.length} denom(s)`} icon={<Coins className="w-5 h-5 text-amber-400" />} />
          <div className="space-y-1 mt-2">
            {d.balance.map((b: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <span className="font-mono text-xs">{b.denom}</span>
                <span className="text-sm font-medium">{formatQIE(b.amount, 6)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!d.accountInfo && !d.isEvm && d.balance.length === 0 && (
        <Card>
          <div className="text-center py-10 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No data found for this address.</p>
            <p className="text-xs mt-1 opacity-60">The address may not have any on-chain activity yet.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-bold text-lg tabular-nums">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono text-xs break-all" : ""}`}>{value || "—"}</span>
    </div>
  );
}
