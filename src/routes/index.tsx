import { Link } from "@tanstack/react-router";
import { NETWORK, FOOTER_LINKS } from "@/data/network";
import { 
  Activity, Boxes, Coins, Users, Layers, Shield, 
  ArrowRight, Zap, Globe, 
  GitBranch, ExternalLink, Sparkles,
  ChevronRight, Database, Mail, TrendingUp,
  BarChart3, PieChart, Clock, Radio, Sun, Moon
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE } from "@/lib/api";
import { AreaChart, Area, PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "QIE Explorer — Hybrid Cosmos + EVM Blockchain Explorer" },
    { name: "description", content: "Explore QIE Mainnet blocks, transactions, validators, and governance. Real-time blockchain data for the hybrid Cosmos + EVM network." },
  ]}),
  component: HomePage,
});

const CHART_COLORS = ["#8B5CF6", "#D946EF", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"];

function useLiveStats() {
  return useQuery({
    queryKey: ["home-stats"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const [status, vals, pool, supply, netInfo] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.validators().catch(() => ({ validators: [] })),
        cosmos.stakingPool().catch(() => ({ pool: { bonded_tokens: "0" } })),
        cosmos.supply().catch(() => []),
        cosmos.netInfo().catch(() => null),
      ]);
      const height = status?.sync_info?.latest_block_height ?? 0;
      const validators = vals?.validators ?? [];
      const activeVals = validators.filter((v: any) => v.status === "BOND_STATUS_BONDED").length;
      const bonded = pool?.pool?.bonded_tokens ?? pool?.bonded_tokens ?? "0";
      const supplyQ = supply?.find((s: any) => s.denom === NETWORK.denom)?.amount ?? "0";
      const stakingRatio = Number(bonded) && Number(supplyQ) ? (Number(bonded) / Number(supplyQ)) * 100 : 0;
      const peers = netInfo?.n_peers ?? 0;

      const topValidators = validators
        .sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens))
        .slice(0, 8)
        .map((v: any) => ({
          name: v.description?.moniker?.slice(0, 10) || "Unknown",
          power: Number(v.tokens) / 1e18,
        }));

      return { height, validators: validators.length, activeVals, bonded, supply: supplyQ, stakingRatio, peers, topValidators };
    },
  });
}

function usePrice() {
  return useQuery({
    queryKey: ["qie-price"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [priceRes, marketRes] = await Promise.all([
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=qie&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true")
          .then(r => r.json()).then(d => d?.qie || null),
        fetch("https://mainnet.qie.digital/api/v2/stats/charts/market")
          .then(r => r.json()).catch(() => null),
      ]);
      return {
        usd: priceRes?.usd,
        usd_24h_change: priceRes?.usd_24h_change,
        usd_market_cap: priceRes?.usd_market_cap,
        usd_24h_vol: priceRes?.usd_24h_vol,
        availableSupply: marketRes?.available_supply,
        marketCapOfficial: marketRes?.chart_data?.[0]?.market_cap,
      };
    },
  });
}

function usePriceChart(period: string) {
  return useQuery({
    queryKey: ["qie-price-chart", period],
    refetchInterval: 60_000,
    queryFn: () =>
      fetch(`https://api.coingecko.com/api/v3/coins/qie/market_chart?vs_currency=usd&days=${period === "live" ? "1" : period}`)
        .then(r => r.json())
        .then(d => (d?.prices || []).map((p: [number, number]) => ({
          time: new Date(p[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(p[0]).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          price: p[1],
        }))),
  });
}

const PERIODS = [
  { key: "live", label: "Live" },
  { key: "1", label: "1D" },
  { key: "7", label: "1W" },
  { key: "30", label: "1M" },
  { key: "365", label: "1Y" },
  { key: "max", label: "All" },
];

function HomePage() {
  const { data: stats } = useLiveStats();
  const { data: price } = usePrice();
  const [period, setPeriod] = useState("live");
  const { data: chartData } = usePriceChart(period);
  const [typedText, setTypedText] = useState("");
  const fullText = "The Gateway to QIE Blockchain";
  const { theme, toggle } = useTheme();

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else { clearInterval(timer); }
    }, 60);
    return () => clearInterval(timer);
  }, []);

  const features = [
    { icon: <Boxes className="w-6 h-6" />, title: "Block Explorer", desc: "Browse blocks, transactions, and addresses in real-time" },
    { icon: <Users className="w-6 h-6" />, title: "Validator Network", desc: "Monitor validators, voting power, and uptime performance" },
    { icon: <Coins className="w-6 h-6" />, title: "Staking Portal", desc: "Track delegations, rewards, and manage your staking portfolio" },
    { icon: <Shield className="w-6 h-6" />, title: "Governance", desc: "Participate in on-chain proposals and network decisions" },
    { icon: <GitBranch className="w-6 h-6" />, title: "IBC & Interchain", desc: "Explore cross-chain connections and IBC channels" },
    { icon: <Activity className="w-6 h-6" />, title: "Network Health", desc: "Real-time consensus state and network parameters" },
  ];

  const stats_cards = [
    { label: "QIE Price", value: price?.usd ? `$${price.usd.toFixed(4)}` : "—", sub: price?.usd_24h_change ? `${price.usd_24h_change.toFixed(2)}%` : "", positive: price?.usd_24h_change > 0, icon: <TrendingUp className="w-5 h-5 text-white" />, color: "from-amber-500 to-yellow-500", shadow: "shadow-amber-500/20" },
    { label: "Market Cap", value: price?.usd_market_cap ? `$${(price.usd_market_cap / 1e6).toFixed(2)}M` : "—", icon: <BarChart3 className="w-5 h-5 text-white" />, color: "from-cyan-500 to-blue-500", shadow: "shadow-cyan-500/20" },
    { label: "Available Supply", value: price?.availableSupply ? `${(Number(price.availableSupply) / 1e6).toFixed(2)}M` : "—", sub: "QIE", icon: <Coins className="w-5 h-5 text-white" />, color: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20" },
    { label: "Latest Block", value: stats?.height ? Number(stats.height).toLocaleString() : "—", icon: <Database className="w-5 h-5 text-white" />, color: "from-violet-500 to-fuchsia-500", shadow: "shadow-violet-500/20" },
    { label: "Validators", value: `${stats?.activeVals || 0} / ${stats?.validators || 0}`, icon: <Users className="w-5 h-5 text-white" />, color: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/20" },
    { label: "Staking Ratio", value: stats?.stakingRatio ? `${stats.stakingRatio.toFixed(1)}%` : "—", icon: <Layers className="w-5 h-5 text-white" />, color: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
  ];

  const pieData = stats ? [
    { name: "Bonded", value: Number(stats.bonded) / 1e18 },
    { name: "Liquid", value: Math.max(0, Number(stats.supply) / 1e18 - Number(stats.bonded) / 1e18) },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20 flex-1 flex items-center">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-violet-500/20 via-fuchsia-500/10 to-transparent rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-gradient-to-t from-cyan-500/10 to-transparent rounded-full blur-3xl opacity-40" />
          <div className="absolute top-20 left-10 w-[300px] h-[300px] bg-gradient-to-r from-amber-500/5 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
        <div className="absolute top-4 right-4 z-10">
          <button type="button" onClick={toggle} aria-label="Toggle theme" className="relative glass rounded-full w-14 h-8 flex items-center transition hover:ring-2 hover:ring-primary/40">
            <span className={`absolute top-1 left-1 w-6 h-6 rounded-full grid place-items-center bg-gradient-to-br from-primary to-accent text-white transition-transform shadow-md ${theme === "light" ? "translate-x-6" : ""}`}>
              {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </span>
          </button>
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="mb-8">
            <img src={NETWORK.logo} alt="QIE Blockchain" className="w-20 h-20 md:w-24 md:h-24 rounded-full mx-auto ring-4 ring-violet-500/30 shadow-2xl shadow-violet-500/20" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 mb-8 shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" /><span className="text-sm text-emerald-400 font-medium">QIE Mainnet Live</span><span className="text-xs text-muted-foreground">Chain ID: {NETWORK.chainId}</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">{typedText}</span><span className="animate-blink text-violet-400">|</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A powerful hybrid blockchain explorer supporting both Cosmos SDK and Ethereum Virtual Machine. Explore blocks, stake with validators, and participate in governance — all in one place.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/dashboard" className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-lg shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 border-b-4 border-violet-700/50 active:border-b-0 active:translate-y-1">
              <Activity className="w-5 h-5 group-hover:animate-pulse" />Launch Explorer<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="https://www.qie.digital/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-violet-500/30 transition-all duration-300 shadow-lg hover:shadow-xl">
              <Globe className="w-4 h-4" />Learn About QIE<ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.7 }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto mt-14">
            {stats_cards.map((s, i) => (
              <div key={s.label} className={`relative group rounded-2xl border-2 border-border/40 bg-card/40 backdrop-blur-sm p-4 hover:border-violet-500/30 transition-all duration-300 shadow-lg hover:shadow-xl ${s.shadow}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} grid place-items-center mx-auto mb-2 shadow-lg border-b-2 border-black/20`}>{s.icon}</div>
                <p className="text-lg font-bold tabular-nums">{s.value}</p>
                {s.sub && <p className={`text-xs font-medium ${s.positive ? 'text-emerald-400' : s.sub.startsWith('-') ? 'text-red-400' : 'text-muted-foreground'}`}>{s.sub}</p>}
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CHARTS */}
      <section className="relative py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-6">
            <ChartCard3D icon={<PieChart className="w-5 h-5 text-violet-400" />} title="Staking Distribution" delay={0}>
              <div className="h-44"><ResponsiveContainer width="100%" height="100%"><RePieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>{pieData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i]} />))}</Pie><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} /></RePieChart></ResponsiveContainer></div>
              <div className="flex justify-center gap-4 mt-2">{pieData.map((d, i) => (<div key={d.name} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ background: CHART_COLORS[i] }} /><span className="text-[11px] text-muted-foreground">{d.name}</span></div>))}</div>
            </ChartCard3D>
            <ChartCard3D icon={<TrendingUp className="w-5 h-5 text-cyan-400" />} title="Top Validators Power" delay={0.1}>
              <div className="h-44">{stats?.topValidators?.length ? (<ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.topValidators} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}><defs><linearGradient id="homeAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} /><stop offset="95%" stopColor="#D946EF" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.3} /><XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={40} /><Area type="monotone" dataKey="power" stroke="#8B5CF6" strokeWidth={2} fill="url(#homeAreaGrad)" dot={false} /></AreaChart></ResponsiveContainer>) : (<div className="h-full grid place-items-center text-xs text-muted-foreground">Loading...</div>)}</div>
            </ChartCard3D>
            <ChartCard3D icon={<Radio className="w-5 h-5 text-amber-400" />} title="Network Pulse" delay={0.2}>
              <div className="space-y-4">
                <ProgressBar label="Peers" value={stats?.peers || 0} max={50} color="from-cyan-500 to-blue-500" textColor="text-cyan-400" />
                <ProgressBar label="Active Validators" value={stats?.activeVals || 0} max={stats?.validators || 1} color="from-emerald-500 to-teal-500" textColor="text-emerald-400" />
                <ProgressBar label="Staking Ratio" value={stats?.stakingRatio || 0} max={100} color="from-violet-500 to-fuchsia-500" textColor="text-violet-400" suffix="%" />
                <div className="pt-2 border-t border-border/30 space-y-1"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Chain Height</span><span className="font-mono font-bold">{stats?.height ? Number(stats.height).toLocaleString() : "—"}</span></div><div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Supply</span><span className="font-mono font-bold">{stats?.supply ? formatQIE(stats.supply, 0) : "—"}</span></div></div>
              </div>
            </ChartCard3D>
          </div>

          {/* Price Chart */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="relative rounded-2xl border-2 border-border/40 bg-card/40 backdrop-blur-sm p-5 hover:border-violet-500/20 transition-all duration-300 max-w-6xl mx-auto shadow-lg hover:shadow-xl">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-amber-400" /><div><h3 className="font-semibold text-sm">QIE Price</h3><div className="flex items-center gap-2"><span className="text-lg font-bold">${price?.usd?.toFixed(4) || "—"}</span>{price?.usd_24h_change && <span className={`text-xs font-medium ${price.usd_24h_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{price.usd_24h_change > 0 ? '↑' : '↓'} {Math.abs(price.usd_24h_change).toFixed(2)}%</span>}{price?.usd_24h_vol && <span className="text-xs text-muted-foreground ml-2">Vol: ${(price.usd_24h_vol / 1e6).toFixed(2)}M</span>}</div></div>
              </div>
              <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 border border-border/40">
                {PERIODS.map((p) => (<button key={p.key} onClick={() => setPeriod(p.key)} className={`px-3 py-1.5 text-xs rounded-lg transition-all ${period === p.key ? "bg-violet-500 text-white shadow-md" : "text-muted-foreground hover:text-foreground"}`}>{p.label}</button>))}
              </div>
            </div>
            <div className="h-64">
              {chartData?.length ? (<ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}><defs><linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.3} /><XAxis dataKey={["1", "7"].includes(period) ? "time" : "date"} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={50} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => `$${Number(v).toFixed(6)}`} /><Area type="monotone" dataKey="price" stroke="#F59E0B" strokeWidth={2} fill="url(#priceGrad)" dot={false} /></AreaChart></ResponsiveContainer>) : (<div className="h-full grid place-items-center text-xs text-muted-foreground">Loading chart...</div>)}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative py-16 md:py-24"><div className="container mx-auto px-4"><div className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-bold mb-4"><span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Everything You Need</span></h2><p className="text-muted-foreground max-w-xl mx-auto">A complete blockchain explorer with powerful tools for developers, validators, and delegators.</p></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">{features.map((f, i) => (<motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }} viewport={{ once: true }} className="group relative rounded-2xl border-2 border-border/40 bg-card/40 backdrop-blur-sm p-6 hover:border-violet-500/20 hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300 shadow-lg"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center mb-4 text-violet-400 group-hover:scale-110 transition-transform border border-violet-500/20 shadow-md">{f.icon}</div><h3 className="font-bold text-lg mb-2">{f.title}</h3><p className="text-sm text-muted-foreground">{f.desc}</p></motion.div>))}</div></div></section>

      {/* CTA */}
      <section className="relative py-16 md:py-24"><div className="container mx-auto px-4"><div className="relative rounded-3xl overflow-hidden border-2 border-violet-500/20 shadow-2xl shadow-violet-500/10"><div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10" /><div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-violet-500/20 to-transparent rounded-full blur-3xl" /><div className="relative p-8 md:p-12 text-center"><Sparkles className="w-12 h-12 text-violet-400 mx-auto mb-4" /><h2 className="text-2xl md:text-4xl font-bold mb-4">Ready to <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Explore QIE?</span></h2><p className="text-muted-foreground max-w-lg mx-auto mb-8">Dive into the QIE blockchain. Monitor blocks, track transactions, stake with validators, and shape the future of the network.</p><Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-lg shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 border-b-4 border-violet-700/50 active:border-b-0 active:translate-y-1"><Zap className="w-5 h-5" />View Explorer<ChevronRight className="w-5 h-5" /></Link></div></div></div></section>

      {/* FOOTER */}
      <footer className="mt-auto border-t-2 border-border/60 bg-background/40 backdrop-blur-xl"><div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8"><div className="col-span-2 md:col-span-1"><div className="flex items-center gap-3"><img src={NETWORK.logo} className="w-10 h-10 rounded-full ring-2 ring-primary/40 shadow-lg" alt="" /><div><div className="font-semibold gradient-text text-lg">QIE Explorer</div><div className="text-xs text-muted-foreground">Mainnet · Chain {NETWORK.chainId}</div></div></div><p className="text-xs text-muted-foreground mt-4 leading-relaxed">Hybrid Cosmos + EVM block explorer for the QIE ecosystem.</p><a href={`mailto:${FOOTER_LINKS.email}`} className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"><Mail className="w-3.5 h-3.5" /> {FOOTER_LINKS.email}</a><p className="text-xs text-muted-foreground mt-3">Powered by{" "}<a href="https://onenov.xyz" target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">OneNov</a></p></div><FCol title="Products" items={FOOTER_LINKS.products} /><FCol title="Developers" items={FOOTER_LINKS.developers} /><FCol title="Community" items={FOOTER_LINKS.community} /><FCol title="Hackathon" items={FOOTER_LINKS.hackathon} /></div><div className="border-t-2 border-border/60 py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} QIE Blockchain. All rights reserved.</div></footer>
    </div>
  );
}

function ChartCard3D({ icon, title, children, delay }: { icon: React.ReactNode; title: string; children: React.ReactNode; delay: number }) {
  return (<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }} viewport={{ once: true }} className="relative rounded-2xl border-2 border-border/40 bg-card/40 backdrop-blur-sm p-5 hover:border-violet-500/20 transition-all duration-300 shadow-lg hover:shadow-xl"><div className="flex items-center gap-2 mb-3">{icon}<h3 className="font-semibold text-sm">{title}</h3></div>{children}</motion.div>);
}

function ProgressBar({ label, value, max, color, textColor, suffix }: { label: string; value: number; max: number; color: string; textColor: string; suffix?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (<div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{label}</span><span className={`font-bold ${textColor}`}>{value}{suffix || `/${max}`}</span></div><div className="h-1.5 rounded-full bg-muted/50 overflow-hidden border border-border/30 shadow-inner"><div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500 shadow-sm`} style={{ width: `${Math.min(pct, 100)}%` }} /></div></div>);
}

function FCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (<div><div className="text-sm font-semibold mb-3">{title}</div><ul className="space-y-2">{items.map((i) => (<li key={i.href}><a href={i.href} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary transition">{i.label}</a></li>))}</ul></div>);
}
