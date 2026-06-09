//src/routes/dashboard.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, evm, evmRpc, formatQIE, hexToNum, shorten } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { StatCard, Card, SectionTitle, Loading, Pill } from "@/components/ui/primitives";
import { Activity, Boxes, Coins, Users, Layers, Percent, Clock, Zap, Sparkles, ChevronRight, ArrowRightLeft, Cpu, GitCommit, Package, Box } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import dayjs from "dayjs";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — QIE Explorer" },
    { name: "description", content: "Live QIE Mainnet stats: blocks, validators, supply, inflation and APR." },
  ]}),
  component: DashboardPage,
});

function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const [status, vals, pool, supply, commPool, evmBlock] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.validators().catch(() => null),
        cosmos.stakingPool().catch(() => null),
        cosmos.supply().catch(() => null),
        cosmos.communityPool().catch(() => null),
        evmRpc<string>("eth_blockNumber").catch(() => "0x0"),
      ]);
      return { status, vals, pool, supply, commPool, evmBlock };
    },
  });
}

function useRecentBlocks() {
  return useQuery({
    queryKey: ["recent-blocks-evm"],
    refetchInterval: 6_000,
    queryFn: async () => {
      const latest = await evm.blockNumber();
      if (!latest) return { blocks: [] as any[], latest: 0 };
      const count = 20;
      const heights = Array.from({ length: count }, (_, i) => latest - i);
      const blocks = await Promise.all(
        heights.map((h) => evm.getBlock(h, true).catch(() => null))
      );
      return { blocks: blocks.filter(Boolean), latest };
    },
  });
}

function useAppVersion() {
  return useQuery({
    queryKey: ["app-version"],
    refetchInterval: 60_000,
    queryFn: async () => {
      try {
        const nodeInfo = await fetch(`${NETWORK.rest}/cosmos/base/tendermint/v1beta1/node_info`)
          .then(r => r.json())
          .catch(() => null);
        
        const appVersion = nodeInfo?.application_version;
        
        if (appVersion) {
          return {
            name: appVersion.name || "—",
            appName: appVersion.app_name || "—",
            version: appVersion.version || "—",
            gitCommit: appVersion.git_commit || "—",
            buildTags: appVersion.build_tags || "—",
            goVersion: appVersion.go_version || "—",
            buildDeps: appVersion.build_deps || [],
            cosmosSdkVersion: appVersion.cosmos_sdk_version || "—",
          };
        }
        
        const status = await cosmos.status().catch(() => null);
        if (status) {
          return {
            name: status.node_info?.version || "—",
            appName: status.node_info?.app_name || "QIE",
            version: status.node_info?.network || "—",
            gitCommit: "—",
            buildTags: "—",
            goVersion: status.node_info?.go_version || "—",
            buildDeps: [],
            cosmosSdkVersion: status.node_info?.cosmos_sdk_version || "—",
          };
        }
        
        return null;
      } catch {
        return null;
      }
    },
  });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-3 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm tabular-nums flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

const PIE_COLORS = ["#8B5CF6", "#D946EF", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

function DashboardPage() {
  const { data, isLoading } = useStats();
  const recent = useRecentBlocks();
  const appVersion = useAppVersion();

  const evmHeight = data?.evmBlock ? parseInt(data.evmBlock, 16) : 0;
  const height = data?.status?.sync_info?.latest_block_height ?? evmHeight;
  const validators = data?.vals?.validators ?? [];
  const activeVals = validators.filter((v: any) => v.status === "BOND_STATUS_BONDED").length;
  const bonded = data?.pool?.bonded_tokens ?? "0";
  const supplyQ = data?.supply?.find((s: any) => s.denom === NETWORK.denom)?.amount ?? "0";
  const stakingRatio = Number(bonded) && Number(supplyQ) ? (Number(bonded) / Number(supplyQ)) * 100 : 0;
  const commPoolQ = data?.commPool?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? "0";

  const blocks = recent.data?.blocks ?? [];
  let avgBlockTime: number | null = null;
  if (blocks.length > 1) {
    const t0 = hexToNum(blocks[0].timestamp) * 1000;
    const tN = hexToNum(blocks[blocks.length - 1].timestamp) * 1000;
    avgBlockTime = Math.abs(t0 - tN) / 1000 / (blocks.length - 1);
  }

  const chartData = [...blocks].reverse().map((b: any) => ({
    h: hexToNum(b.number),
    txs: b.transactions?.length ?? 0,
    time: dayjs(hexToNum(b.timestamp) * 1000).format("HH:mm:ss"),
  }));

  const bondedNum = Number(bonded) / 1e18;
  const liquidNum = Math.max(0, Number(supplyQ) / 1e18 - bondedNum);
  const pieData = [
    { name: "Bonded", value: bondedNum },
    { name: "Liquid", value: liquidNum },
    { name: "Comm. Pool", value: Number(commPoolQ) / 1e18 },
  ].filter(d => d.value > 0);

  const validatorPie = [
    { name: "Active", value: activeVals },
    { name: "Inactive", value: validators.length - activeVals },
  ].filter(d => d.value > 0);

  const recentTxs = blocks
    .flatMap((b: any) => {
      const h = hexToNum(b.number);
      const ts = hexToNum(b.timestamp) * 1000;
      return (b.transactions ?? []).slice(0, 3).map((tx: any) => ({
        hash: tx.hash ?? tx,
        block: h,
        time: ts,
      }));
    })
    .slice(0, 8);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10 border border-violet-500/20"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-lg opacity-40 animate-pulse" />
              <img src={NETWORK.logo} alt="QIE" className="w-14 h-14 rounded-full ring-2 ring-violet-400/50 relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Pill variant="success" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </Pill>
                <span className="text-xs text-muted-foreground font-mono">{NETWORK.cosmosChainId}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mt-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                QIE Mainnet Explorer
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3 h-3 text-violet-500" />
                Hybrid Cosmos + EVM · Chain {NETWORK.chainId}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Latest Block</div>
            <div className="text-3xl font-bold tabular-nums bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
              {height ? Number(height).toLocaleString() : "—"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="w-3 h-3 text-amber-500" />
              EVM: {evmHeight.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      {isLoading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Chain Height" value={Number(height ?? 0).toLocaleString()} icon={<Boxes className="w-4 h-4 text-violet-500" />} />
          <StatCard label="Validators" value={validators.length} sub={`${activeVals} active`} icon={<Users className="w-4 h-4 text-blue-500" />} />
          <StatCard label="Total Supply" value={formatQIE(supplyQ, 0)} sub={NETWORK.symbol} icon={<Coins className="w-4 h-4 text-amber-500" />} />
          <StatCard label="Bonded" value={formatQIE(bonded, 0)} sub={`${stakingRatio.toFixed(2)}% staked`} icon={<Layers className="w-4 h-4 text-emerald-500" />} />
          <StatCard label="Block Time" value={avgBlockTime ? `${avgBlockTime.toFixed(2)}s` : "—"} icon={<Clock className="w-4 h-4 text-cyan-500" />} />
          <StatCard label="Staking Ratio" value={`${stakingRatio.toFixed(2)}%`} icon={<Percent className="w-4 h-4 text-pink-500" />} />
          <StatCard label="Network" value="Healthy" sub="Producing blocks" icon={<Activity className="w-4 h-4 text-emerald-500" />} />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Block Activity Chart */}
        <Card className="lg:col-span-2">
          <SectionTitle title="Block Activity" sub="Transactions per block (last 20)" />
          <div className="h-64 px-2 pb-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                      <stop offset="60%" stopColor="#D946EF" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#D946EF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="txs"
                    name="Transactions"
                    stroke="#8B5CF6"
                    strokeWidth={2.5}
                    fill="url(#txGrad)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: "#8B5CF6" }}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Waiting for data...</div>
            )}
          </div>
        </Card>

        {/* Network Pulse Pie Charts */}
        <Card>
          <SectionTitle title="Network Pulse" sub="Distribution overview" />
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1 px-1">Staking</p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      isAnimationActive={true}
                      animationDuration={600}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-1">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-[11px] text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1 px-1">Validators</p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={validatorPie}
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      isAnimationActive={true}
                      animationDuration={600}
                    >
                      {validatorPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i + 2]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-1">
                {validatorPie.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i + 2] }} />
                    <span className="text-[11px] text-muted-foreground">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Latest Blocks + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Blocks */}
        <Card>
          <SectionTitle 
            title="Latest Blocks" 
            action={
              <Link to="/blocks" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            } 
          />
          <div className="divide-y divide-border/50">
            {blocks.slice(0, 8).map((b: any) => {
              const h = hexToNum(b.number);
              return (
                <Link
                  key={b.hash}
                  to="/blocks/$height"
                  params={{ height: String(h) }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-medium tabular-nums group-hover:text-violet-500 transition-colors">
                      {h.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground/50 font-mono">
                      {dayjs(hexToNum(b.timestamp) * 1000).format("HH:mm:ss")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {b.transactions?.length ?? 0} txs
                  </span>
                </Link>
              );
            })}
            {blocks.length === 0 && (
              <div className="text-sm text-muted-foreground p-6 text-center">Waiting for blocks...</div>
            )}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <SectionTitle 
            title="Recent Transactions" 
            action={
              <Link to="/transactions" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            } 
          />
          <div className="divide-y divide-border/50">
            {recentTxs.length > 0 ? (
              recentTxs.map((tx: any, i: number) => (
                <Link
                  key={`${tx.hash}-${i}`}
                  to="/tx/$hash"
                  params={{ hash: String(tx.hash) }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ArrowRightLeft className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-muted-foreground truncate group-hover:text-cyan-400 transition-colors">
                        {shorten(String(tx.hash), 8, 6)}
                      </div>
                      <div className="text-[11px] text-muted-foreground/50">
                        Block #{tx.block.toLocaleString()} · {dayjs(tx.time).format("HH:mm:ss")}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-sm text-muted-foreground p-6 text-center">No recent transactions</div>
            )}
          </div>
        </Card>
      </div>

      {/* Application Versions - PALING BAWAH */}
      {appVersion.data && (
        <Card>
          <SectionTitle title="Application Versions" sub="Node software information" icon={<Package className="w-5 h-5 text-violet-400" />} />
          <div className="space-y-3 mt-2">
            {/* Main info rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <VersionRow icon={<Box className="w-3.5 h-3.5 text-emerald-400" />} label="App Name" value={appVersion.data.appName} />
              <VersionRow icon={<Cpu className="w-3.5 h-3.5 text-blue-400" />} label="Name" value={appVersion.data.name} />
              <VersionRow icon={<Package className="w-3.5 h-3.5 text-violet-400" />} label="Version" value={appVersion.data.version} />
              <VersionRow icon={<GitCommit className="w-3.5 h-3.5 text-amber-400" />} label="Git Commit" value={appVersion.data.gitCommit} mono />
              <VersionRow icon={<Zap className="w-3.5 h-3.5 text-cyan-400" />} label="Go Version" value={appVersion.data.goVersion} />
              <VersionRow icon={<Layers className="w-3.5 h-3.5 text-pink-400" />} label="Cosmos SDK" value={appVersion.data.cosmosSdkVersion} />
              {appVersion.data.buildTags && appVersion.data.buildTags !== "—" && (
                <VersionRow icon={<Sparkles className="w-3.5 h-3.5 text-rose-400" />} label="Build Tags" value={appVersion.data.buildTags} />
              )}
            </div>

            {/* Build Deps - Scrollable */}
            {appVersion.data.buildDeps && appVersion.data.buildDeps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <GitCommit className="w-3.5 h-3.5 text-amber-400" /> Build Dependencies
                  <span className="text-[10px] opacity-60">({appVersion.data.buildDeps.length})</span>
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {appVersion.data.buildDeps.map((dep: any, i: number) => {
                    const path = typeof dep === "string" ? dep : dep.path ?? dep.name ?? "";
                    const version = typeof dep === "object" ? dep.version ?? dep.sum ?? "" : "";
                    return (
                      <div key={i} className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                        <span className="font-mono text-muted-foreground truncate mr-2">{path}</span>
                        {version && <span className="text-muted-foreground/50 shrink-0 font-mono">{version}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function VersionRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <span className={`text-xs font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
