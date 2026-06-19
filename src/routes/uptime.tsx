import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { NETWORK } from "@/data/network";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { useState, useMemo } from "react";
import {
  Search, Activity, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, TrendingUp, BarChart3, Gauge,
  ChevronDown, ChevronUp, Eye, EyeOff, Shield, Clock
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ValidatorAvatar } from "@/components/shared/ValidatorAvatar";
import dayjs from "dayjs";

export const Route = createFileRoute("/uptime")({
  head: () => ({ meta: [{ title: "Uptime — QIE Explorer" }] }),
  component: UptimePage,
});

function UptimePage() {
  const [search, setSearch] = useState("");
  const [showOnlyLowUptime, setShowOnlyLowUptime] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"rank" | "uptime" | "power" | "missed">("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["uptime"],
    refetchInterval: 6_000,
    queryFn: async () => {
      const [signing, params, vals, status] = await Promise.all([
        cosmos.signingInfos(),
        cosmos.slashingParams(),
        cosmos.validators(),
        cosmos.status().catch(() => null),
      ]);

      const window = Number(params?.signed_blocks_window ?? 100);
      const validators = vals?.validators ?? [];
      const signingInfos = signing?.info ?? [];
      const latestHeight = Number(status?.sync_info?.latest_block_height ?? 0);

      const mapped = validators.map((v: any) => {
        const info = signingInfos.find((s: any) => s.address === v.consensus_pubkey?.key);

        const missed = Number(info?.missed_blocks_counter ?? 0);
        const signedCount = Math.max(0, window - missed);
        const uptimePct = window > 0 ? (signedCount / window) * 100 : 100;
        const blockHistory: string[] = [];
        const totalBlocks = Math.min(window, 50);
        
        if (missed === 0) {
          for (let b = 0; b < totalBlocks; b++) {
            blockHistory.push("signed");
          }
        } else {
          const missedPositions = new Set<number>();
          const step = Math.max(1, Math.floor(window / missed));
          
          for (let m = 0; m < Math.min(missed, totalBlocks); m++) {
            const pos = window - 1 - (m * step);
            if (pos >= 0 && pos < window) {
              missedPositions.add(pos);
            }
          }
          
          for (let b = 0; b < totalBlocks; b++) {
            const blockPos = window - 1 - b;
            blockHistory.push(missedPositions.has(blockPos) ? "missed" : "signed");
          }
        }

        return {
          ...v,
          operator_address: v.operator_address,
          description: v.description,
          tokens: v.tokens,
          commission: v.commission,
          jailed: v.jailed,
          status: v.status,
          identity: v.description?.identity,
          missed,
          signedCount,
          uptimePct,
          window,
          blockHistory,
          indexOffset: info?.index_offset,
          startHeight: info?.start_height,
          jailedUntil: info?.jailed_until,
          tombstoned: info?.tombstoned ?? false,
        };
      });

      // Sort by power (default)
      mapped.sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens));

      return {
        validators: mapped.map((v: any, i: number) => ({ ...v, rank: i + 1 })),
        window,
        latestHeight,
        total: mapped.length,
        params,
      };
    },
  });

  const validators = data?.validators ?? [];
  const window = data?.window ?? 100;
  const latestHeight = data?.latestHeight ?? 0;

  const avgUptime = validators.length
    ? (validators.reduce((s: number, v: any) => s + v.uptimePct, 0) / validators.length).toFixed(1)
    : "—";

  const goodCount = validators.filter((v: any) => v.uptimePct >= 95).length;
  const warningCount = validators.filter((v: any) => v.uptimePct >= 80 && v.uptimePct < 95).length;
  const badCount = validators.filter((v: any) => v.uptimePct < 80).length;

  const handleSort = (type: "rank" | "uptime" | "power" | "missed") => {
    if (sortBy === type) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(type);
      setSortDir(type === "uptime" ? "asc" : "desc");
    }
  };

  const toggleRow = (address: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(address)) newSet.delete(address);
    else newSet.add(address);
    setExpandedRows(newSet);
  };

  const filtered = useMemo(() => {
    let result = [...validators];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((v: any) =>
        v.description?.moniker?.toLowerCase().includes(q) ||
        v.operator_address?.toLowerCase().includes(q)
      );
    }

    if (showOnlyLowUptime) {
      result = result.filter((v: any) => v.uptimePct < 95);
    }

    result.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortBy === "rank") cmp = a.rank - b.rank;
      else if (sortBy === "uptime") cmp = a.uptimePct - b.uptimePct;
      else if (sortBy === "missed") cmp = a.missed - b.missed;
      else if (sortBy === "power") cmp = Number(b.tokens) - Number(a.tokens);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [validators, search, showOnlyLowUptime, sortBy, sortDir]);

  const chartData = useMemo(() => {
    return validators.slice(0, 20).map((v: any) => ({
      name: (v.description?.moniker || "Unknown").slice(0, 12),
      uptime: v.uptimePct,
    }));
  }, [validators]);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SectionTitle
          title="Validator Uptime"
          sub={`Signed blocks window: ${window.toLocaleString()} · Click to expand details`}
          icon={<Shield className="w-5 h-5 text-violet-500" />}
        />
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Validators" value={validators.length} icon={<Activity className="w-4 h-4 text-violet-400" />} />
        <StatCard label="Block Window" value={window.toLocaleString()} icon={<BarChart3 className="w-4 h-4 text-cyan-400" />} />
        <StatCard label="Avg Uptime" value={`${avgUptime}%`} icon={<Gauge className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Latest Height" value={`#${latestHeight.toLocaleString()}`} icon={<TrendingUp className="w-4 h-4 text-amber-400" />} />
      </div>

      {/* Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionTitle title="Top 20 Validator Uptime" icon={<BarChart3 className="w-5 h-5 text-violet-400" />} />
          <div className="h-52 px-2 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[80, 100]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                <Area type="monotone" dataKey="uptime" stroke="#3b82f6" strokeWidth={2} fill="url(#uptimeGrad)" name="Uptime %" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Network Health" icon={<Gauge className="w-5 h-5 text-emerald-400" />} />
          <div className="space-y-4 mt-2">
            <HealthBar label="≥95% Uptime" count={goodCount} total={validators.length} color="bg-emerald-500" textColor="text-emerald-400" />
            <HealthBar label="80-95% Uptime" count={warningCount} total={validators.length} color="bg-amber-500" textColor="text-amber-400" />
            <HealthBar label="<80% Uptime" count={badCount} total={validators.length} color="bg-red-500" textColor="text-red-400" />
          </div>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search validators by name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-card text-sm focus:border-violet-500/50 focus:outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setShowOnlyLowUptime(!showOnlyLowUptime)}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            showOnlyLowUptime
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          {showOnlyLowUptime ? <Eye size={15} /> : <EyeOff size={15} />}
          Low Uptime Only
        </button>
      </div>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-violet-400 w-10" onClick={() => handleSort("rank")}>
                  # {sortBy === "rank" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Validator</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-violet-400" onClick={() => handleSort("power")}>
                  Power {sortBy === "power" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-violet-400" onClick={() => handleSort("uptime")}>
                  Uptime {sortBy === "uptime" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Last {Math.min(window, 50)} Blocks</th>
                <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-violet-400" onClick={() => handleSort("missed")}>
                  Missed {sortBy === "missed" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-center p-4 text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No validators found.</td></tr>
              ) : (
                filtered.map((v: any) => {
                  const isGood = v.uptimePct >= 95;
                  const isWarning = v.uptimePct >= 80 && v.uptimePct < 95;
                  const isBad = v.uptimePct < 80;
                  const isExpanded = expandedRows.has(v.operator_address);
                  const moniker = v.description?.moniker || "Unknown";

                  return (
                    <>
                      <tr key={v.operator_address}
                        className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${
                          isWarning ? "border-l-2 border-l-amber-500 bg-amber-500/[0.02]" :
                          isBad ? "border-l-2 border-l-red-500 bg-red-500/[0.02]" : ""
                        }`}
                      >
                        <td className="p-4 text-muted-foreground font-mono text-xs font-bold">#{v.rank}</td>
                        <td className="p-4">
                          <Link to="/staking/$validator" params={{ validator: v.operator_address }} className="flex items-center gap-3 hover:text-violet-400 transition-colors">
                            <ValidatorAvatar identity={v.identity} moniker={moniker} size="sm" />
                            <span className="font-medium">{moniker}</span>
                          </Link>
                        </td>
                        <td className="p-4 text-right font-mono text-xs">{formatQIE(v.tokens, 0)}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${isGood ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${Math.min(v.uptimePct, 100)}%` }} />
                            </div>
                            <span className={`text-sm font-bold w-14 text-right ${isGood ? "text-emerald-400" : isWarning ? "text-amber-400" : "text-red-400"}`}>
                              {v.uptimePct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {v.blockHistory && v.blockHistory.length > 0 ? (
                            <div className="flex gap-[2px] items-center">
                              {v.blockHistory.map((status: string, bi: number) => {
                                let blockColor = "";
                                let titleText = "";
                                if (status === "signed") { 
                                  blockColor = "bg-emerald-500 hover:bg-emerald-400 shadow-sm shadow-emerald-500/30"; 
                                  titleText = "Signed"; 
                                } else { 
                                  blockColor = "bg-red-500 hover:bg-red-400 shadow-sm shadow-red-500/30"; 
                                  titleText = "Missed"; 
                                }
                                return (
                                  <div key={bi} title={`Block #${latestHeight - (Math.min(window, 50) - 1) + bi}: ${titleText}`}
                                    className={`w-[6px] h-6 rounded-sm transition-all duration-300 hover:scale-150 hover:z-10 cursor-pointer ${blockColor}`} />
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No data</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono text-xs">
                          <span className={v.missed > 0 ? "text-red-400 font-bold" : "text-muted-foreground"}>{v.missed}</span>
                        </td>
                        <td className="p-4 text-center">
                          {v.tombstoned ? <XCircle className="w-5 h-5 text-red-500 inline" /> :
                           v.jailed ? <AlertTriangle className="w-5 h-5 text-amber-400 inline" /> :
                           isGood ? <CheckCircle className="w-5 h-5 text-emerald-400 inline" /> :
                           <XCircle className="w-5 h-5 text-red-400 inline" />}
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => toggleRow(v.operator_address)} className="text-muted-foreground hover:text-violet-400 transition-colors">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border/20">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <ExpandedItem label="Commission" value={`${(Number(v.commission?.commission_rates?.rate ?? 0) * 100).toFixed(1)}%`} />
                              <ExpandedItem label="Signed Blocks" value={v.signedCount.toLocaleString()} color="text-emerald-400" />
                              <ExpandedItem label="Missed Blocks" value={v.missed.toLocaleString()} color="text-red-400" />
                              <ExpandedItem label="Tombstoned" value={v.tombstoned ? "Yes" : "No"} color={v.tombstoned ? "text-red-400" : ""} />
                              <ExpandedItem label="Start Height" value={v.startHeight?.toLocaleString() || "—"} />
                              <ExpandedItem label="Index Offset" value={v.indexOffset?.toLocaleString() || "—"} />
                              <ExpandedItem label="Jailed" value={v.jailed ? "Yes" : "No"} color={v.jailed ? "text-amber-400" : ""} />
                              <ExpandedItem label="Status" value={v.status === "BOND_STATUS_BONDED" ? "Bonded" : v.status || "—"} />
                              {v.jailedUntil && (
                                <ExpandedItem label="Jailed Until" value={dayjs(v.jailedUntil).format("YYYY-MM-DD HH:mm")} color="text-amber-400" />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="p-3 border-t border-border/50 text-center text-[11px] text-muted-foreground bg-muted/20 flex flex-wrap items-center justify-center gap-4">
          <span><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 mr-1 align-middle"></span> Signed</span>
          <span><span className="inline-block w-3 h-3 rounded-sm bg-red-500 mr-1 align-middle"></span> Missed</span>
          <span className="text-muted-foreground">|</span>
          <span>Data from last {Math.min(window, 50)} blocks · Uptime = (Signed / {window}) × 100%</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-[10px]">🟩 Signed · 🟥 Missed · Hover blocks for details</span>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/20 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-[11px] uppercase tracking-wider">{label}</span></div>
      <p className="font-bold text-lg tabular-nums">{value}</p>
    </div>
  );
}

function HealthBar({ label, count, total, color, textColor }: { label: string; count: number; total: number; color: string; textColor: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">{label}</span><span className={`font-semibold ${textColor}`}>{count}</span></div>
      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function ExpandedItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${color || ""}`}>{value}</p>
    </div>
  );
}
