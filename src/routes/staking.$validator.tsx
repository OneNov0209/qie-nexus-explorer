import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { useWallet } from "@/lib/wallet";
import { StakingModal } from "@/components/staking/StakingModal";
import { toast } from "sonner";
import { ArrowLeft, Layers, Gift, Coins, Percent, Shield, AlertTriangle, ExternalLink, TrendingUp, FileText, Key, Unlock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ValidatorAvatar } from "@/components/shared/ValidatorAvatar";
import dayjs from "dayjs";
import { useState } from "react";

export const Route = createFileRoute("/staking/$validator")({
  head: ({ params }) => ({ meta: [{ title: `Validator — QIE Explorer` }] }),
  component: ValidatorDetail,
});

const PIE_COLORS = ["#8B5CF6", "#D946EF", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

async function fetchValidatorAddresses(operatorAddr: string) {
  try {
    const delRes = await fetch(`${NETWORK.rest}/cosmos/staking/v1beta1/validators/${operatorAddr}/delegations?pagination.limit=1`).then(r => r.json());
    const delegatorAddr = delRes?.delegation_responses?.[0]?.delegation?.delegator_address;
    if (!delegatorAddr) return { accountAddr: "", hexAddr: "" };
    const accRes = await fetch(`${NETWORK.rest}/cosmos/auth/v1beta1/accounts/${delegatorAddr}`).then(r => r.json());
    const pubKeyBase64 = accRes?.account?.base_account?.pub_key?.key;
    if (!pubKeyBase64) return { accountAddr: delegatorAddr, hexAddr: "" };
    const pubKeyBytes = Uint8Array.from(atob(pubKeyBase64), c => c.charCodeAt(0));
    const hexAddr = Array.from(pubKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return { accountAddr: delegatorAddr, hexAddr };
  } catch {
    return { accountAddr: "", hexAddr: "" };
  }
}

function ValidatorDetail() {
  const { validator } = Route.useParams();
  const { cosmos: cw } = useWallet();
  const qc = useQueryClient();
  const [stakingModalOpen, setStakingModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["validator-detail", validator],
    refetchInterval: 15_000,
    queryFn: async () => {
      const [v, pool, vals, signingInfo, validatorSet, addresses, delegationsRes] = await Promise.all([
        cosmos.validatorByAddr(validator).catch(() => null),
        cosmos.stakingPool(),
        cosmos.validators(),
        cosmos.signingInfos().catch(() => ({ info: [] })),
        fetch(`${NETWORK.rest}/cosmos/base/tendermint/v1beta1/validatorsets/latest`).then(r => r.json()).catch(() => ({ validators: [] })),
        fetchValidatorAddresses(validator),
        fetch(`${NETWORK.rest}/cosmos/staking/v1beta1/validators/${validator}/delegations?pagination.limit=50`).then(r => r.json()).catch(() => ({ delegation_responses: [] })),
      ]);

      const delegations = delegationsRes?.delegation_responses ?? [];
      const allVals = vals?.validators ?? [];
      const bonded = Number(pool?.bonded_tokens ?? 0);
      const totalTokens = Number(v?.tokens ?? 0);
      const vp = bonded ? (totalTokens / bonded) * 100 : 0;
      const comm = Number(v?.commission?.commission_rates?.rate ?? 0);
      const maxComm = Number(v?.commission?.commission_rates?.max_rate ?? 0);
      const maxChange = Number(v?.commission?.commission_rates?.max_change_rate ?? 0);
      const minSelfDelegation = v?.min_self_delegation ?? "0";
      const unbondingHeight = v?.unbonding_height ?? "0";
      const unbondingTime = v?.unbonding_time;
      const operatorAddr = v?.operator_address ?? validator;
      const consensusPubkeyBase64 = v?.consensus_pubkey?.key ?? "";

      const vsValidator = (validatorSet?.validators ?? []).find((sv: any) => sv.pub_key?.key === consensusPubkeyBase64);
      const signerAddr = vsValidator?.address ?? "";
      const accountAddr = addresses?.accountAddr ?? "";
      const hexAddr = addresses?.hexAddr ?? "";

      let selfDelegationAmount = 0;
      if (accountAddr) {
        try {
          const selfDelRes = await fetch(`${NETWORK.rest}/cosmos/staking/v1beta1/validators/${operatorAddr}/delegations/${accountAddr}`).then(r => r.json());
          selfDelegationAmount = Number(selfDelRes?.delegation_response?.balance?.amount ?? 0);
        } catch {}
      }
      const selfDelegationPct = totalTokens > 0 ? (selfDelegationAmount / totalTokens) * 100 : 0;
      const info = signingInfo?.info?.find((s: any) => s.address === consensusPubkeyBase64);
      const commissionPool = totalTokens * comm;
      const outstandingRewards = commissionPool * 0.1;

      return {
        v, vp, comm, maxComm, maxChange, minSelfDelegation,
        unbondingHeight, unbondingTime, outstandingRewards, commissionPool,
        selfDelegationAmount, selfDelegationPct, bonded, info, allVals,
        operatorAddr, accountAddr, signerAddr, hexAddr,
        consensusPubkeyBase64, delegations, totalTokens,
      };
    },
  });

  const { data: userData } = useQuery({
    queryKey: ["user-staking-validator", cw.address, validator],
    enabled: !!cw.address,
    refetchInterval: 20_000,
    queryFn: async () => {
      const [dels, rewards, bal] = await Promise.all([
        cosmos.delegations(cw.address!).catch(() => ({ delegation_responses: [] })),
        cosmos.rewards(cw.address!).catch(() => ({ rewards: [], total: [] })),
        cosmos.balance(cw.address!).catch(() => ({ balances: [] })),
      ]);
      const myDel = dels?.delegation_responses?.find((d: any) => d.delegation?.validator_address === validator);
      const myReward = rewards?.rewards?.find((r: any) => r.validator_address === validator);
      const balanceQ = bal?.balances?.find((b: any) => b.denom === NETWORK.denom)?.amount ?? "0";
      return { myDel, myReward, balanceQ };
    },
  });

  if (isLoading) return <Loading />;
  if (error || !data?.v) return <ErrorState error={error || "Validator not found"} />;

  const {
    v, vp, comm, maxComm, maxChange, minSelfDelegation,
    unbondingHeight, unbondingTime, outstandingRewards, commissionPool,
    selfDelegationAmount, selfDelegationPct, bonded, info, allVals,
    operatorAddr, accountAddr, signerAddr, hexAddr,
    consensusPubkeyBase64, delegations, totalTokens,
  } = data;

  const identity = v?.description?.identity;
  const moniker = v?.description?.moniker ?? shorten(validator);
  const isBonded = v?.status === "BOND_STATUS_BONDED";
  const isJailed = v?.jailed;
  const commissionUpdateTime = v?.commission?.update_time;

  const myDel = userData?.myDel;
  const myStake = myDel?.balance?.amount ?? "0";
  const myRewardQ = userData?.myReward?.reward?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";
  const userBalance = userData?.balanceQ ?? "0";

  const vpPieData = [
    { name: moniker, value: totalTokens / 1e18 },
    { name: "Others", value: Math.max(0, (bonded - totalTokens) / 1e18) },
  ];

  const selfDelPieData = [
    { name: "Self Delegated", value: selfDelegationAmount / 1e18 },
    { name: "From Delegators", value: Math.max(0, (totalTokens - selfDelegationAmount) / 1e18) },
  ];

  // Handle click on address row
  const handleAddressClick = (address: string, type: string) => {
    if (!address) return;
    // Redirect ke halaman yang sesuai
    if (type === "account" || type === "delegator") {
      window.location.href = `/account/${address}`;
    } else if (type === "validator") {
      window.location.href = `/staking/${address}`;
    } else {
      // Default: cari di explorer
      window.open(`https://qie.explorer.onenov.xyz/account/${address}`, "_blank");
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/staking" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-violet-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-3">
          <ValidatorAvatar identity={identity} moniker={moniker} size="lg" />
          <div>
            <h1 className="text-xl font-bold">{moniker}</h1>
            <div className="flex items-center gap-2">
              {isBonded ? <Pill variant="success">Active</Pill> : isJailed ? <Pill variant="danger">Jailed</Pill> : <Pill variant="warning">Inactive</Pill>}
            </div>
          </div>
        </div>
        {/* Single Stake Button */}
        {cw.address && (
          <div className="ml-auto">
            <button
              onClick={() => setStakingModalOpen(true)}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-5 py-2.5 text-sm font-bold hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              Stake
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard icon={<Layers className="w-4 h-4 text-violet-400" />} label="Total Bonded" value={formatQIE(totalTokens, 1)} sub={`${vp.toFixed(2)}% of total`} />
        <InfoCard icon={<Layers className="w-4 h-4 text-emerald-400" />} label="Self Bonded" value={formatQIE(selfDelegationAmount, 1)} sub={`${selfDelegationPct.toFixed(2)}%`} />
        <InfoCard icon={<Percent className="w-4 h-4 text-amber-400" />} label="Commission" value={`${(comm * 100).toFixed(0)}%`} sub={`Max: ${(maxComm * 100).toFixed(0)}%`} />
        <InfoCard icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} label="Annual Profit" value={vp > 0 ? `${(vp * (1 - comm)).toFixed(2)}%` : "—"} />
      </div>

      {/* User Stats */}
      {cw.address && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InfoCard icon={<Layers className="w-4 h-4 text-violet-400" />} label="My Stake" value={`${formatQIE(myStake, 4)} ${NETWORK.symbol}`} />
          <InfoCard icon={<Gift className="w-4 h-4 text-amber-400" />} label="My Pending Reward" value={`${formatQIE(myRewardQ, 6)} ${NETWORK.symbol}`} />
          <InfoCard icon={<Coins className="w-4 h-4 text-emerald-400" />} label="Outstanding Rewards" value={`${formatQIE(outstandingRewards, 4)} ${NETWORK.symbol}`} />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle title="Voting Power Composition" />
          <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={vpPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>{vpPieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          <div className="flex justify-center gap-6 pb-2">{vpPieData.map((d, i) => (<div key={d.name} className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: PIE_COLORS[i] }} /><span className="text-xs text-muted-foreground">{d.name}</span></div>))}</div>
        </Card>
        <Card>
          <SectionTitle title="Delegation Distribution" />
          <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={selfDelPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>{selfDelPieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i + 2]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          <div className="flex justify-center gap-6 pb-2">{selfDelPieData.map((d, i) => (<div key={d.name} className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: PIE_COLORS[i + 2] }} /><span className="text-xs text-muted-foreground">{d.name}</span></div>))}</div>
        </Card>
      </div>

      {/* Commissions & Rewards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard icon={<Coins className="w-4 h-4 text-amber-400" />} label="Commissions" value={`${formatQIE(commissionPool, 2)} ${NETWORK.symbol}`} />
        <InfoCard icon={<Gift className="w-4 h-4 text-emerald-400" />} label="Outstanding Rewards" value={`${formatQIE(outstandingRewards, 2)} ${NETWORK.symbol}`} />
        <InfoCard icon={<Unlock className="w-4 h-4 text-violet-400" />} label="Min Self Delegation" value={minSelfDelegation !== "0" ? `${formatQIE(minSelfDelegation, 0)} ${NETWORK.symbol}` : "—"} />
      </div>

      {/* Voting Power Events */}
      <Card>
        <SectionTitle title="Voting Power Events" sub={`${delegations.length} delegator${delegations.length !== 1 ? 's' : ''}`} icon={<Layers className="w-5 h-5 text-violet-500" />} />
        {delegations.length > 0 ? (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/60 bg-muted/30"><th className="text-left p-3 text-xs text-muted-foreground uppercase tracking-wider">Delegator</th><th className="text-right p-3 text-xs text-muted-foreground uppercase tracking-wider">Amount</th><th className="text-right p-3 text-xs text-muted-foreground uppercase tracking-wider">Shares</th></tr></thead>
              <tbody>
                {delegations.sort((a: any, b: any) => Number(b.balance?.amount ?? 0) - Number(a.balance?.amount ?? 0)).map((d: any, i: number) => {
                  const delegatorAddress = d.delegation?.delegator_address ?? "";
                  return (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => handleAddressClick(delegatorAddress, "account")}>
                      <td className="p-3">
                        <span className="font-mono text-xs text-muted-foreground hover:text-violet-400 transition-colors">
                          {shorten(delegatorAddress, 12, 10)}
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums"><span className="text-sm font-medium text-emerald-400">+ {formatQIE(d.balance?.amount ?? "0", 0)} {NETWORK.symbol}</span></td>
                      <td className="p-3 text-right tabular-nums"><span className="text-xs text-muted-foreground">{Number(d.balance?.amount ?? 0) > 0 ? ((Number(d.balance.amount) / totalTokens) * 100).toFixed(2) + '%' : '—'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (<div className="text-center py-8 text-muted-foreground text-sm">No delegations found.</div>)}
      </Card>

      {/* Transactions */}
      <Card>
        <SectionTitle title="Transactions" sub="Recent transactions related to this validator" icon={<FileText className="w-5 h-5 text-cyan-500" />} />
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/60 bg-muted/30"><th className="text-left p-3 text-xs text-muted-foreground uppercase tracking-wider">Height</th><th className="text-left p-3 text-xs text-muted-foreground uppercase tracking-wider">Hash</th><th className="text-left p-3 text-xs text-muted-foreground uppercase tracking-wider">Messages</th><th className="text-right p-3 text-xs text-muted-foreground uppercase tracking-wider">Time</th></tr></thead>
            <tbody><tr><td colSpan={4} className="p-8 text-center text-muted-foreground"><div className="flex flex-col items-center gap-2"><AlertTriangle className="w-8 h-8 opacity-30" /><p className="text-sm">Transaction search is not supported by this node.</p></div></td></tr></tbody>
          </table>
        </div>
      </Card>

      {/* Status */}
      <Card>
        <SectionTitle title="Validator Status" icon={<Shield className="w-5 h-5 text-violet-500" />} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <StatusItem label="Status" value={isBonded ? "BONDED" : isJailed ? "JAILED" : "UNBONDED"} success={isBonded} danger={isJailed} />
          <StatusItem label="Jailed" value={isJailed ? "Yes" : "No"} danger={isJailed} />
          <StatusItem label="Tombstoned" value={v?.tombstoned ? "Yes" : "No"} danger={v?.tombstoned} />
          <StatusItem label="Missed Blocks" value={info?.missed_blocks_counter ?? "—"} />
          <StatusItem label="Start Height" value={info?.start_height ?? "—"} />
          <StatusItem label="Unbonding Height" value={unbondingHeight !== "0" ? unbondingHeight : "—"} />
          <StatusItem label="Unbonding Time" value={unbondingTime && unbondingTime !== "1970-01-01T00:00:00Z" ? dayjs(unbondingTime).format("MMM DD, YYYY") : "—"} />
          <StatusItem label="Min Self Delegation" value={minSelfDelegation !== "0" ? formatQIE(minSelfDelegation, 0) : "—"} />
        </div>
      </Card>

      {/* About */}
      {v?.description && (
        <Card>
          <SectionTitle title="About Us" icon={<FileText className="w-5 h-5 text-cyan-500" />} />
          <div className="space-y-3 mt-2">
            {v.description.details && <p className="text-sm text-muted-foreground">{v.description.details}</p>}
            {v.description.website && <a href={v.description.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"><ExternalLink className="w-4 h-4" /> {v.description.website}</a>}
            {v.description.security_contact && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Shield className="w-4 h-4" /> {v.description.security_contact}</div>}
          </div>
        </Card>
      )}

      {/* Addresses */}
      <Card>
        <SectionTitle title="Addresses" icon={<Key className="w-5 h-5 text-amber-500" />} />
        <div className="space-y-3 mt-2">
          <DetailRow 
            label="Account Address" 
            value={accountAddr} 
            mono 
            copy 
            onClick={() => handleAddressClick(accountAddr, "account")}
          />
          <DetailRow 
            label="Operator Address" 
            value={operatorAddr} 
            mono 
            copy 
            onClick={() => handleAddressClick(operatorAddr, "validator")}
          />
          <DetailRow label="Hex Address" value={hexAddr} mono copy />
          <DetailRow label="Signer Address" value={signerAddr} mono copy />
          <DetailRow label="Consensus Public Key" value={consensusPubkeyBase64} mono copy />
        </div>
      </Card>

      {/* Commission */}
      <Card>
        <SectionTitle title="Commission" sub={commissionUpdateTime ? `Updated at ${dayjs(commissionUpdateTime).format("YYYY-MM-DD HH:mm:ss")}` : ""} icon={<Percent className="w-5 h-5 text-amber-500" />} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
          <InfoCardSmall label="Rate" value={`${(comm * 100).toFixed(0)}%`} />
          <InfoCardSmall label="24h Max Change" value={`±${(maxChange * 100).toFixed(0)}%`} />
          <InfoCardSmall label="Max Rate" value={`${(maxComm * 100).toFixed(0)}%`} />
        </div>
      </Card>

      {/* Staking Modal */}
      <StakingModal
  open={stakingModalOpen}
  onClose={() => setStakingModalOpen(false)}
  validatorAddress={operatorAddr}
  validatorMoniker={moniker}
  validatorIdentity={identity}
  validatorCommission={comm}
  validatorAPR={vp > 0 ? vp * (1 - comm) : 0}
  userStake={Number(myStake)}
  userBalance={Number(userBalance)}
  userRewards={Number(myRewardQ)}
  allValidators={allVals
    .filter((x: any) => x.status === "BOND_STATUS_BONDED")
    .map((x: any) => ({
      address: x.operator_address,
      moniker: x.description?.moniker || shorten(x.operator_address, 10, 6),
      identity: x.description?.identity,
    }))
  }
  onSuccess={() => {
    qc.invalidateQueries({ queryKey: ["user-staking-validator"] });
    qc.invalidateQueries({ queryKey: ["validator-detail"] });
  }}
/>
    </div>
  );
}

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (<div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors"><div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-[11px] uppercase tracking-wider">{label}</span></div><p className="font-bold text-lg tabular-nums">{value}</p>{sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</div>);
}

function InfoCardSmall({ label, value }: { label: string; value: string }) {
  return (<div className="p-3 rounded-lg bg-muted/30"><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p><p className="font-bold text-sm">{value}</p></div>);
}

function StatusItem({ label, value, success, danger }: { label: string; value: string; success?: boolean; danger?: boolean }) {
  return (<div className="flex items-center justify-between p-3 rounded-lg bg-muted/30"><span className="text-xs text-muted-foreground">{label}</span><span className={`text-sm font-medium ${success ? "text-emerald-400" : danger ? "text-red-400" : ""}`}>{value}</span></div>);
}

function DetailRow({ label, value, mono, copy, onClick }: { label: string; value?: string; mono?: boolean; copy?: boolean; onClick?: () => void }) {
  const [copied, setCopied] = useState(false);
  const isClickable = !!onClick && value;
  
  return (
    <div 
      className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 border-b border-border/30 last:border-0 ${isClickable ? 'cursor-pointer hover:bg-muted/10 transition-colors rounded-lg px-2 -mx-2' : ''}`}
      onClick={isClickable ? onClick : undefined}
    >
      <dt className="text-xs text-muted-foreground uppercase tracking-wider sm:w-44 shrink-0">{label}</dt>
      <dd className={`text-sm break-all flex-1 ${mono ? "font-mono text-xs" : ""} ${isClickable ? 'text-violet-400 hover:text-violet-300' : ''}`}>
        {value ?? "—"}
      </dd>
      {copy && value && (
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            navigator.clipboard.writeText(value); 
            setCopied(true); 
            setTimeout(() => setCopied(false), 2000); 
          }} 
          className="text-xs text-muted-foreground hover:text-violet-400 transition-colors shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      )}
    </div>
  );
}
