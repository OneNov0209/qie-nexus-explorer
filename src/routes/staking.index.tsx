import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill, StatCard } from "@/components/ui/primitives";
import { NETWORK, WALLET_LOGOS } from "@/data/network";
import { useWallet } from "@/lib/wallet";
import { useState } from "react";
import { Gift, Layers, Coins, Search, User, AlertTriangle, CheckCircle, Clock, ChevronRight, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/staking/")({
  head: () => ({ meta: [{ title: "Staking — QIE Explorer" }] }),
  component: StakingListPage,
});

type FilterType = "all" | "active" | "inactive" | "jailed";

function StakingListPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const { cosmos: cw } = useWallet();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["validators"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [vals, pool] = await Promise.all([
        cosmos.validators(),
        cosmos.stakingPool(),
      ]);
      return { vals: vals?.validators ?? [], pool };
    },
  });

  const { data: userData } = useQuery({
    queryKey: ["user-staking", cw.address],
    enabled: !!cw.address,
    refetchInterval: 20_000,
    queryFn: async () => {
      const [dels, rewards, bal] = await Promise.all([
        cosmos.delegations(cw.address!).catch(() => ({ delegation_responses: [] })),
        cosmos.rewards(cw.address!).catch(() => ({ rewards: [], total: [] })),
        cosmos.balance(cw.address!).catch(() => ({ balances: [] })),
      ]);
      return { dels, rewards, bal };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const bonded = Number(data?.pool?.bonded_tokens ?? 0);
  const vals = data?.vals ?? [];
  const activeCount = vals.filter((v: any) => v.status === "BOND_STATUS_BONDED").length;
  const jailedCount = vals.filter((v: any) => v.jailed).length;
  const inactiveCount = vals.length - activeCount - jailedCount;

  const list = vals
    .filter((v: any) => {
      if (filter === "active") return v.status === "BOND_STATUS_BONDED";
      if (filter === "inactive") return v.status !== "BOND_STATUS_BONDED" && !v.jailed;
      if (filter === "jailed") return v.jailed;
      return true;
    })
    .filter((v: any) => {
      if (!q) return true;
      const lower = q.toLowerCase();
      return (
        v.description?.moniker?.toLowerCase().includes(lower) ||
        v.operator_address?.toLowerCase().includes(lower)
      );
    })
    .sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens));

  const myDels: any[] = userData?.dels?.delegation_responses ?? [];
  const myRewards: any[] = userData?.rewards?.rewards ?? [];
  const totalReward = userData?.rewards?.total?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";
  const totalStaked = myDels.reduce((a, d) => a + Number(d.balance?.amount ?? 0), 0);
  const balanceQ = userData?.bal?.balances?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";

  return (
    <div className="space-y-6 pb-8">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1"><CheckCircle className="w-4 h-4" /><span className="text-[11px] uppercase tracking-wider">Active</span></div>
          <p className="text-2xl font-bold">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-1"><Clock className="w-4 h-4" /><span className="text-[11px] uppercase tracking-wider">Inactive</span></div>
          <p className="text-2xl font-bold">{inactiveCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-red-400 mb-1"><AlertTriangle className="w-4 h-4" /><span className="text-[11px] uppercase tracking-wider">Jailed</span></div>
          <p className="text-2xl font-bold">{jailedCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-violet-400 mb-1"><Layers className="w-4 h-4" /><span className="text-[11px] uppercase tracking-wider">Total Bonded</span></div>
          <p className="text-xl font-bold">{formatQIE(bonded, 0)}</p>
        </div>
      </div>

      {/* Keplr Staking Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={WALLET_LOGOS.keplr} alt="Keplr" className="w-8 h-8" />
          <div>
            <p className="text-sm font-medium">Stake with Keplr Dashboard</p>
            <p className="text-xs text-muted-foreground">Delegate, undelegate, and claim rewards directly on Keplr</p>
          </div>
        </div>
        <a
          href="https://wallet.keplr.app/chains/qie"
          target="_blank"
          rel="noreferrer"
          className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all shrink-0 flex items-center gap-1.5"
        >
          Open Keplr <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* User Stats */}
      {cw.address && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Wallet Balance" value={`${formatQIE(balanceQ, 4)} ${NETWORK.symbol}`} icon={<Coins className="w-4 h-4" />} />
          <StatCard label="Total Staked" value={`${formatQIE(totalStaked, 4)} ${NETWORK.symbol}`} sub={`${myDels.length} validators`} icon={<Layers className="w-4 h-4" />} />
          <StatCard label="Pending Rewards" value={`${formatQIE(totalReward, 6)} ${NETWORK.symbol}`} icon={<Gift className="w-4 h-4" />} />
          <div className="flex items-center justify-center">
            <a
              href="https://wallet.keplr.app/chains/qie"
              target="_blank"
              rel="noreferrer"
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-5 py-3 text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Claim in Keplr
            </a>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <SectionTitle title="Validators" sub={`${list.length} validators shown`} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by moniker or address…"
              className="w-64 pl-9 pr-3 py-2 rounded-xl border border-border/60 bg-card text-sm focus:border-violet-500/50 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-card border border-border/60 rounded-xl p-1">
            {(["all", "active", "inactive", "jailed"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-all ${
                  filter === f ? "bg-violet-500 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Validator Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">#</th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Moniker</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Voting Power</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">APR</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Commission</th>
                <th className="text-center p-4 text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v: any, i: number) => {
                const comm = Number(v.commission?.commission_rates?.rate ?? 0);
                const vp = bonded ? (Number(v.tokens) / bonded) * 100 : 0;
                const bondedOk = v.status === "BOND_STATUS_BONDED";
                const identity = v.description?.identity;

                return (
                  <tr key={v.operator_address} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                    <td className="p-4 text-muted-foreground tabular-nums text-xs">{i + 1}</td>
                    <td className="p-4">
                      <Link to="/staking/$validator" params={{ validator: v.operator_address }} className="flex items-center gap-3 group/link">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center shrink-0 overflow-hidden">
                          {identity ? (
                            <img
                              src={`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <User className="w-4 h-4 text-violet-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium group-hover/link:text-violet-400 transition-colors flex items-center gap-1.5">
                            {v.description?.moniker ?? shorten(v.operator_address)}
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-all" />
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{shorten(v.operator_address, 10, 8)}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      <div className="font-medium">{formatQIE(v.tokens, 0)}</div>
                      <div className="text-[11px] text-muted-foreground">{vp.toFixed(2)}%</div>
                    </td>
                    <td className="p-4 text-right tabular-nums text-violet-400 font-medium">{vp > 0 ? (vp * (1 - comm)).toFixed(2) : "—"}%</td>
                    <td className="p-4 text-right tabular-nums">{(comm * 100).toFixed(2)}%</td>
                    <td className="p-4 text-center">
                      {bondedOk ? <Pill variant="success">Active</Pill> : v.jailed ? <Pill variant="danger">Jailed</Pill> : <Pill variant="warning">Inactive</Pill>}
                    </td>
                    <td className="p-4 text-right">
                      <a
                        href="https://wallet.keplr.app/chains/qie"
                        target="_blank"
                        rel="noreferrer"
                        className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs rounded-lg px-2.5 py-1.5 transition-colors inline-flex items-center gap-1"
                      >
                        Stake <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No validators found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
