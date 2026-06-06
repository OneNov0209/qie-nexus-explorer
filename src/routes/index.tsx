import { Link } from "@tanstack/react-router";
import { NETWORK } from "@/data/network";
import { 
  Activity, Boxes, Coins, Users, Layers, Shield, 
  Search, ArrowRight, Zap, Globe, Server, 
  GitBranch, Code2, ExternalLink, Sparkles,
  ChevronRight, TrendingUp, Database, Radio
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "QIE Explorer — Hybrid Cosmos + EVM Blockchain Explorer" },
    { name: "description", content: "Explore QIE Mainnet blocks, transactions, validators, and governance. Real-time blockchain data for the hybrid Cosmos + EVM network." },
  ]}),
  component: HomePage,
});

function useLiveStats() {
  return useQuery({
    queryKey: ["home-stats"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const [status, vals, pool, supply] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.validators().catch(() => ({ validators: [] })),
        cosmos.stakingPool().catch(() => ({ pool: { bonded_tokens: "0" } })),
        cosmos.supply().catch(() => []),
      ]);
      const height = status?.sync_info?.latest_block_height ?? 0;
      const validators = vals?.validators?.length ?? 0;
      const bonded = pool?.pool?.bonded_tokens ?? pool?.bonded_tokens ?? "0";
      const supplyQ = supply?.find((s: any) => s.denom === NETWORK.denom)?.amount ?? "0";
      return { height, validators, bonded, supply: supplyQ };
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
    { label: "Latest Block", value: stats?.height ? Number(stats.height).toLocaleString() : "—", icon: <Database className="w-5 h-5" />, color: "from-violet-500 to-fuchsia-500" },
    { label: "Validators", value: stats?.validators?.toLocaleString() || "—", icon: <Users className="w-5 h-5" />, color: "from-blue-500 to-cyan-500" },
    { label: "Total Supply", value: stats?.supply ? formatQIE(stats.supply, 0) : "—", icon: <Coins className="w-5 h-5" />, color: "from-amber-500 to-orange-500" },
    { label: "Bonded", value: stats?.bonded ? formatQIE(stats.bonded, 0) : "—", icon: <Layers className="w-5 h-5" />, color: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="min-h-screen">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-violet-500/20 via-fuchsia-500/10 to-transparent rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-gradient-to-t from-cyan-500/10 to-transparent rounded-full blur-3xl opacity-40" />
          <div className="absolute top-20 left-10 w-[300px] h-[300px] bg-gradient-to-r from-amber-500/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />

        <div className="relative container mx-auto px-4 text-center">
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
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-12"
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
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={NETWORK.logo} alt="QIE" className="w-8 h-8 rounded-full" />
              <div>
                <p className="text-sm font-medium">QIE Explorer</p>
                <p className="text-xs text-muted-foreground">Hybrid Cosmos + EVM Network</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="https://www.qie.digital/" target="_blank" rel="noreferrer" className="hover:text-violet-400 transition-colors">QIE Digital</a>
              <a href="https://docs.qie.digital/" target="_blank" rel="noreferrer" className="hover:text-violet-400 transition-colors">Documentation</a>
              <a href="https://github.com/qieadmin" target="_blank" rel="noreferrer" className="hover:text-violet-400 transition-colors">GitHub</a>
              <a href="https://discord.com/invite/8DD4kSHBvr" target="_blank" rel="noreferrer" className="hover:text-violet-400 transition-colors">Discord</a>
            </div>

            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} QIE Blockchain. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
