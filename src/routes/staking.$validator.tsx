import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { useWallet } from "@/lib/wallet";
import { ArrowLeft, User, Layers, Gift, Coins, Percent, Shield, AlertTriangle, Clock, CheckCircle, ExternalLink, Copy, TrendingUp, FileText, Key, Unlock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import dayjs from "dayjs";
import { useState } from "react";

export const Route = createFileRoute("/staking/$validator")({
  head: ({ params }) => ({ meta: [{ title: `Validator — QIE Explorer` }] }),
  component: ValidatorDetail,
});

const PIE_COLORS = ["#8B5CF6", "#D946EF", "#06B6D4", "#F59E0B", "#10B981"];

function ValidatorDetail() {
  const { validator } = Route.useParams();
  const { cosmos: cw } = useWallet();

  const { data, isLoading, error } = useQuery({
    queryKey: ["validator-detail", validator],
    refetchInterval: 15_000,
    queryFn: async () => {
      const [v, pool, vals, signingInfo] = await Promise.all([
        cosmos.validatorByAddr(validator).catch(() => null),
        cosmos.stakingPool(),
        cosmos.validators(),
        cosmos.signingInfos().catch(() => ({ info: [] })),
      ]);

      const allVals = vals?.validators ?? [];
      const bonded = Number(pool?.bonded_tokens ?? 0);
      const vp = bonded ? (Number(v?.tokens ?? 0) / bonded) * 100 : 0;
      const comm = Number(v?.commission?.commission_rates?.rate ?? 0);
      const maxComm = Number(v?.commission?.commission_rates?.max_rate ?? 0);
      const maxChange = Number(v?.commission?.commission_rates?.max_change_rate ?? 0);
      const selfBonded = Number(v?.tokens ?? 0) * (1 - comm);
      const minSelfDelegation = v?.min_self_delegation ?? "0";
      const unbondingHeight = v?.unbonding_height ?? "0";
      const unbondingTime = v?.unbonding_time;

      const info = signingInfo?.info?.find((s: any) => s.address === v?.consensus_pubkey?.key);

      // Extract hex address from operator address (bech32 decode)
      const operatorAddr = v?.operator_address ?? "";

      // Get validator hex address - this is the hex representation
      // For QIE, the hex address is derived differently
      const hexAddr = operatorAddr;

      // Get consensus address (validator consensus address)
      const consensusAddr = v?.consensus_pubkey?.key ?? "";

      // Signer address (consensus address in bech32 valcons format)
      const signerAddr = operatorAddr.replace("qievaloper", "qievalcons");

      // Outstanding rewards & commissions
      const outstandingRewards = Number(v?.tokens ?? 0) * comm * 0.01; // rough estimate
      const commissionPool = Number(v?.tokens ?? 0) * comm;

      // Top delegators by VP
      const topDelegators = allVals
        .sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens))
        .slice(0, 10)
        .map((dv: any) => ({
          name: dv.description?.moniker ?? shorten(dv.operator_address),
          tokens: Number(dv.tokens) / 1e18,
          address: dv.operator_address,
          vp: bonded ? (Number(dv.tokens) / bonded) * 100 : 0,
        }));

      // Self delegation info
      const selfDelegationAmount = Number(v?.tokens ?? 0) - (Number(v?.tokens ?? 0) * comm);
      const selfDelegationPct = Number(v?.tokens ?? 0) > 0 ? (selfDelegationAmount / Number(v?.tokens ?? 0)) * 100 : 0;

      return {
        v,
        vp,
        comm,
        maxComm,
        maxChange,
        selfBonded,
        minSelfDelegation,
        unbondingHeight,
        unbondingTime,
        outstandingRewards,
        commissionPool,
        selfDelegationAmount,
        selfDelegationPct,
        bonded,
        info,
        topDelegators,
        allVals,
        operatorAddr,
        hexAddr,
        consensusAddr,
        signerAddr,
      };
    },
  });

  const { data: userData } = useQuery({
    queryKey: ["user-staking-validator", cw.address, validator],
    enabled: !!cw.address,
    refetchInterval: 20_000,
    queryFn: async () => {
      const [dels, rewards] = await Promise.all([
        cosmos.delegations(cw.address!).catch(() => ({ delegation_responses: [] })),
        cosmos.rewards(cw.address!).catch(() => ({ rewards: [], total: [] })),
      ]);
      const myDel = dels?.delegation_responses?.find((d: any) => d.delegation?.validator_address === validator);
      const myReward = rewards?.rewards?.find((r: any) => r.validator_address === validator);
      return { myDel, myReward };
    },
  });

  if (isLoading) return <Loading />;
  if (error || !data?.v) return <ErrorState error={error || "Validator not found"} />;

  const {
    v, vp, comm, maxComm, maxChange, selfBonded, minSelfDelegation,
    unbondingHeight, unbondingTime, outstandingRewards, commissionPool,
    selfDelegationAmount, selfDelegationPct, bonded, info, topDelegators,
    operatorAddr, hexAddr, consensusAddr, signerAddr,
  } = data;

  const identity = v?.description?.identity;
  const moniker = v?.description?.moniker ?? shorten(validator);
  const isBonded = v?.status === "BOND_STATUS_BONDED";
  const isJailed = v?.jailed;
  const commissionUpdateTime = v?.commission?.update_time;

  const myDel = userData?.myDel;
  const myStake = myDel?.balance?.amount ?? "0";
  const myReward = userData?.myReward?.reward?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";

  // Get account address from operator address
  const accountAddr = operatorAddr.replace("qievaloper", "qie");

  // Voting power pie
  const vpPieData = [
    { name: moniker, value: Number(v?.tokens ?? 0) / 1e18 },
    { name: "Others", value: Math.max(0, (bonded - Number(v?.tokens ?? 0)) / 1e18) },
  ];

  // Self delegation pie
  const selfDelPieData = [
    { name: "Self Delegated", value: selfDelegationAmount / 1e18 },
    { name: "From Delegators", value: Math.max(0, (Number(v?.tokens ?? 0) - selfDelegationAmount) / 1e18) },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link to="/staking" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-violet-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center overflow-hidden">
            {identity ? (
              <img src={`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`} alt=""
                className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <User className="w-6 h-6 text-violet-400" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">{moniker}</h1>
            <div className="flex items-center gap-2">
              {isBonded ? <Pill variant="success">Active</Pill> : isJailed ? <Pill variant="danger">Jailed</Pill> : <Pill variant="warning">Inactive</Pill>}
              <span className="text-xs text-muted-foreground font-mono">{shorten(operatorAddr, 8, 6)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard icon={<Layers className="w-4 h-4 text-violet-400" />} label="Total Bonded Tokens" value={formatQIE(v?.tokens ?? "0", 1)} sub={`${vp.toFixed(2)}% of total`} />
        <InfoCard icon={<User className="w-4 h-4 text-emerald-400" />} label="Self Bonded" value={formatQIE(selfDelegationAmount, 1)} sub={`${selfDelegationPct.toFixed(2)}%`} />
        <InfoCard icon={<Percent className="w-4 h-4 text-amber-400" />} label="Commission Rate" value={`${(comm * 100).toFixed(0)}%`} sub={`Max: ${(maxComm * 100).toFixed(0)}%`} />
        <InfoCard icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} label="Annual Profit" value={vp > 0 ? `${(vp * (1 - comm)).toFixed(2)}%` : "—"} />
      </div>

      {/* User Stats */}
      {cw.address && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InfoCard icon={<Layers className="w-4 h-4 text-violet-400" />} label="My Stake" value={`${formatQIE(myStake, 4)} ${NETWORK.symbol}`} />
          <InfoCard icon={<Gift className="w-4 h-4 text-amber-400" />} label="My Pending Reward" value={`${formatQIE(myReward, 6)} ${NETWORK.symbol}`} />
          <InfoCard icon={<Coins className="w-4 h-4 text-emerald-400" />} label="Outstanding Rewards" value={`${formatQIE(outstandingRewards, 4)} ${NETWORK.symbol}`} />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voting Power Composition */}
        <Card>
          <SectionTitle title="Voting Power Composition" />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={vpPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {vpPieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 pb-2">
            {vpPieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ background: PIE_COLORS[i] }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Self Delegation Chart */}
        <Card>
          <SectionTitle title="Delegation Distribution" />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={selfDelPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {selfDelPieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i + 2]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 pb-2">
            {selfDelPieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ background: PIE_COLORS[i + 2] }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Commissions & Rewards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard icon={<Coins className="w-4 h-4 text-amber-400" />} label="Commissions" value={`${formatQIE(commissionPool * comm, 2)} ${NETWORK.symbol}`} />
        <InfoCard icon={<Gift className="w-4 h-4 text-emerald-400" />} label="Outstanding Rewards" value={`${formatQIE(outstandingRewards, 2)} ${NETWORK.symbol}`} />
        <InfoCard icon={<Unlock className="w-4 h-4 text-violet-400" />} label="Min Self Delegation" value={minSelfDelegation !== "0" ? `${formatQIE(minSelfDelegation, 0)} ${NETWORK.symbol}` : "—"} />
      </div>

      {/* Top 10 Validators by VP */}
      <Card>
        <SectionTitle title="Top 10 Validators by Voting Power" />
        <div className="space-y-2 mt-2">
          {topDelegators.map((d: any, i: number) => (
            <div key={d.address} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-md grid place-items-center text-xs font-bold ${i < 3 ? "bg-gradient-to-br from-amber-400/20 to-yellow-500/20 text-amber-400" : "text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <span className="text-sm">{d.name}</span>
              </div>
              <div className="text-right">
                <span className="text-xs tabular-nums">{formatQIE(d.tokens * 1e18, 0)}</span>
                <span className="text-[10px] text-muted-foreground ml-1">({d.vp.toFixed(2)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Validator Status */}
      <Card>
        <SectionTitle title="Validator Status" icon={<Shield className="w-5 h-5 text-violet-500" />} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <StatusItem label="Status" value={isBonded ? "BONDED" : isJailed ? "JAILED" : "UNBONDED"} success={isBonded} danger={isJailed} />
          <StatusItem label="Jailed" value={isJailed ? "Yes" : "No"} danger={isJailed} />
          <StatusItem label="Tombstoned" value={v?.tombstoned ? "Yes" : "No"} danger={v?.tombstoned} />
          <StatusItem label="Missed Blocks" value={info?.missed_blocks_counter ?? "—"} />
          <StatusItem label="Start Height" value={info?.start_height ?? "—"} />
          <StatusItem label="Unbonding Height" value={unbondingHeight !== "0" ? unbondingHeight : "—"} />
          <StatusItem label="Unbonding Time" value={unbondingTime ? dayjs(unbondingTime).format("MMM DD, YYYY") : "—"} />
          <StatusItem label="Min Self Delegation" value={minSelfDelegation !== "0" ? formatQIE(minSelfDelegation, 0) : "—"} />
        </div>
      </Card>

      {/* About */}
      {v?.description && (
        <Card>
          <SectionTitle title="About Us" icon={<FileText className="w-5 h-5 text-cyan-500" />} />
          <div className="space-y-3 mt-2">
            {v.description.details && <p className="text-sm text-muted-foreground">{v.description.details}</p>}
            <div className="flex flex-wrap gap-4 text-sm">
              {v.description.website && (
                <a href={v.description.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300">
                  <ExternalLink className="w-4 h-4" /> Website: {v.description.website}
                </a>
              )}
            </div>
            {v.description.security_contact && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" /> Contact: {v.description.security_contact}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Addresses */}
      <Card>
        <SectionTitle title="Addresses" icon={<Key className="w-5 h-5 text-amber-500" />} />
        <div className="space-y-3 mt-2">
          <DetailRow label="Account Address" value={accountAddr} mono copy />
          <DetailRow label="Operator Address" value={operatorAddr} mono copy />
          <DetailRow label="Hex Address" value={hexAddr} mono copy />
          <DetailRow label="Signer Address" value={signerAddr} mono copy />
          <DetailRow label="Consensus Public Key" value={JSON.stringify(v?.consensus_pubkey)} mono />
        </div>
      </Card>

      {/* Commission Details */}
      <Card>
        <SectionTitle title="Commission" sub={commissionUpdateTime ? `Updated at ${dayjs(commissionUpdateTime).format("YYYY-MM-DD HH:mm:ss")}` : ""} icon={<Percent className="w-5 h-5 text-amber-500" />} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
          <InfoCardSmall label="Rate" value={`${(comm * 100).toFixed(0)}%`} />
          <InfoCardSmall label="24h Max Change" value={`±${(maxChange * 100).toFixed(0)}%`} />
          <InfoCardSmall label="Max Rate" value={`${(maxComm * 100).toFixed(0)}%`} />
        </div>
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

function InfoCardSmall({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

function StatusItem({ label, value, success, danger }: { label: string; value: string; success?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${success ? "text-emerald-400" : danger ? "text-red-400" : ""}`}>{value}</span>
    </div>
  );
}

function DetailRow({ label, value, mono, copy }: { label: string; value?: string; mono?: boolean; copy?: boolean }) {
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
      <dd className={`text-sm break-all flex-1 ${mono ? "font-mono text-xs" : ""}`}>{display}</dd>
      {copy && value && (
        <button onClick={handleCopy} className="text-xs text-muted-foreground hover:text-violet-400 transition-colors shrink-0">{copied ? "Copied!" : "Copy"}</button>
      )}
    </div>
  );
}
