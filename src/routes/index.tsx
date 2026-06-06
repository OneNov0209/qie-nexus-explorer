import { Link } from "@tanstack/react-router";
import { NETWORK, FOOTER_LINKS } from "@/data/network";
import { 
  Activity, Boxes, Coins, Users, Layers, Shield, 
  ArrowRight, Zap, Globe, 
  GitBranch, ExternalLink, Sparkles,
  ChevronRight, Database, Mail, TrendingUp,
  BarChart3, PieChart, Clock, Radio
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE } from "@/lib/api";
import { AreaChart, Area, PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

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

      // Top validators for chart
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

function HomePage() {
  const { data: stats } = useLiveStats();
  const [typedText, setTypedText] = useState("");
  const fullText = "The Gateway to QIE Blockchain";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
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
    { label: "Latest Block", value: stats?.height ? Number(stats.height).toLocaleString() : "—", icon: <Database className="w-5 h-5 text-white" />, color: "from-violet-500 to-fuchsia-500" },
    { label: "Validators", value: `${stats?.activeVals || 0} / ${stats?.validators || 0}`, icon: <Users className="w-5 h-5 text-white" />, color: "from-blue-500 to-cyan-500" },
    { label: "Total Supply", value: stats?.supply ? formatQIE(stats.supply, 0) : "—", icon: <Coins className="w-5 h-5 text-white" />, color: "from-amber-500 to-orange-500" },
    { label: "Staking Ratio", value: stats?.stakingRatio ? `${stats.stakingRatio.toFixed(1)}%` : "—", icon: <Layers className="w-5 h-5 text-white" />, color: "from-emerald-500 to-teal-500" },
  ];

  // Pie data for network stats
  const pieData = stats ? [
    { name: "Bonded", value: Number(stats.bonded) / 1e18 },
    { name: "Liquid", value: Math.max(0, Number(stats.supply) / 1e18 - Number(stats.bonded) / 1e18) },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20 flex-1 flex items-center">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-violet-500/20 via-fuchsia-500/10 to-transparent rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-gradient-to-t from-cyan-500/10 to-transparent rounded-full blur-3xl opacity-40" />
          <div className="absolute top-20 left-10 w-[300px] h-[300px] bg-gradient-to-r from-amber-500/5 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />

        <div className="relative container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <img 
              src={NETWORK.logo} 
              alt="QIE Blockchain" 
              className="w-20 h-20 md:w-24 md:h-24 rounded-full mx-auto ring-4 ring-violet-500/30 shadow-2xl shadow-violet-500/20"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
            <span className="text-sm text-emerald-400 font-medium">QIE Mainnet Live</span>
            <span className="text-xs text-muted-foreground">Chain ID: {NETWORK.chainId}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              {typedText}
            </span>
            <span className="animate-blink text-violet-400">|</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            A powerful hybrid blockchain explorer supporting both Cosmos SDK and Ethereum Virtual Machine. 
            Explore blocks, stake with validators, and participate in governance — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/dashboard"
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-lg shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300"
            >
              <Activity className="w-5 h-5 group-hover:animate-pulse" />
              Launch Explorer
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="https://www.qie.digital/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-violet-500/30 transition-all duration-300"
            >
              <Globe className="w-4 h-4" />
              Learn About QIE
              <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-14"
          >
            {stats_cards.map((s, i) => (
              <div
                key={s.label}
                className="relative group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 hover:border-violet-500/20 transition-all duration-300"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} grid place-items-center mx-auto mb-2 shadow-lg`}>
                  {s.icon}
                </div>
                <p className="text-lg font-bold tabular-nums">{s.value}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CHARTS SECTION */}
      <section className="relative py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Pie Chart - Staking Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="relative rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 hover:border-violet-500/20 transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-3">
                <PieChart className="w-5 h-5 text-violet-400" />
                <h3 className="font-semibold text-sm">Staking Distribution</h3>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i] }} />
                    <span className="text-[11px] text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Area Chart - Validator Power */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="relative rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 hover:border-violet-500/20 transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-sm">Top Validators Power</h3>
              </div>
              <div className="h-44">
                {stats?.topValidators?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.topValidators} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="homeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#D946EF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={40} />
                      <Area type="monotone" dataKey="power" stroke="#8B5CF6" strokeWidth={2} fill="url(#homeAreaGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full grid place-items-center text-xs text-muted-foreground">Loading...</div>
                )}
              </div>
            </motion.div>

            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 hover:border-violet-500/20 transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Network Pulse</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Peers</span><span className="font-bold text-cyan-400">{stats?.peers || "—"}</span></div>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${Math.min((stats?.peers || 0) / 50 * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Active Validators</span><span className="font-bold text-emerald-400">{stats?.activeVals || 0}/{stats?.validators || 0}</span></div>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${stats?.validators ? (stats.activeVals / stats.validators) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Staking Ratio</span><span className="font-bold text-violet-400">{stats?.stakingRatio?.toFixed(1) || "0"}%</span></div>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: `${Math.min(stats?.stakingRatio || 0, 100)}%` }} />
                  </div>
                </div>
                <div className="pt-2 border-t border-border/30">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Chain Height</span><span className="font-mono font-bold text-white">{stats?.height ? Number(stats.height).toLocaleString() : "—"}</span></div>
                </div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Supply</span><span className="font-mono font-bold text-white">{stats?.supply ? formatQIE(stats.supply, 0) : "—"}</span></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="relative py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Everything You Need
              </span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete blockchain explorer with powerful tools for developers, validators, and delegators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center mb-4 text-violet-400 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="relative py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden border border-violet-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-violet-500/20 to-transparent rounded-full blur-3xl" />
            
            <div className="relative p-8 md:p-12 text-center">
              <Sparkles className="w-12 h-12 text-violet-400 mx-auto mb-4" />
              <h2 className="text-2xl md:text-4xl font-bold mb-4">
                Ready to{" "}
                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Explore QIE?
                </span>
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Dive into the QIE blockchain. Monitor blocks, track transactions, stake with validators, and shape the future of the network.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-lg shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300"
              >
                <Zap className="w-5 h-5" />
                View Explorer
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <img src={NETWORK.logo} className="w-10 h-10 rounded-full ring-1 ring-primary/40" alt="" />
              <div>
                <div className="font-semibold gradient-text text-lg">QIE Explorer</div>
                <div className="text-xs text-muted-foreground">Mainnet · Chain {NETWORK.chainId}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Hybrid Cosmos + EVM block explorer for the QIE ecosystem.
            </p>
            <a href={`mailto:${FOOTER_LINKS.email}`} className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary">
              <Mail className="w-3.5 h-3.5" /> {FOOTER_LINKS.email}
            </a>
            <p className="text-xs text-muted-foreground mt-3">
              Powered by{" "}
              <a href="https://onenov.xyz" target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
                OneNov
              </a>
            </p>
          </div>
          <FCol title="Products" items={FOOTER_LINKS.products} />
          <FCol title="Developers" items={FOOTER_LINKS.developers} />
          <FCol title="Community" items={FOOTER_LINKS.community} />
          <FCol title="Hackathon" items={FOOTER_LINKS.hackathon} />
        </div>
        <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} QIE Blockchain. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <a href={i.href} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary transition">
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
