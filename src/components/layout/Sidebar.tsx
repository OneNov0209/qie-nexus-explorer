import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Boxes, Receipt, Vote, Layers, Activity,
  Coins, Settings2, Network, FileCode2, RefreshCw, AppWindow, Radio,
  ChevronLeft, ChevronRight, BarChart3, ArrowRightLeft, Gauge,
  Users, CheckCircle, GitBranch, ExternalLink
} from "lucide-react";
import { NETWORK } from "@/data/network";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuGroups = [
  {
    label: "Core",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/blocks", label: "Blocks", icon: Boxes },
      { to: "/transactions", label: "Transactions", icon: Receipt },
    ]
  },
  {
    label: "DeFi & Trading",
    items: [
      { to: "/swap", label: "Swap", icon: ArrowRightLeft },
      { to: "/pairs", label: "Pairs", icon: BarChart3 },
      { to: "/bridge", label: "Bridge", icon: ExternalLink },
    ]
  },
  {
    label: "Staking & Governance",
    items: [
      { to: "/staking", label: "Staking", icon: Layers },
      { to: "/governance", label: "Governance", icon: Vote },
      { to: "/uptime", label: "Uptime", icon: Activity },
    ]
  },
  {
    label: "Explorer",
    items: [
      { to: "/gas-tracker", label: "Gas Tracker", icon: Gauge },
      { to: "/top-accounts", label: "Top Accounts", icon: Users },
      { to: "/tokens", label: "Tokens", icon: Coins },
      { to: "/token-transfers", label: "Token Transfers", icon: ArrowRightLeft },
      { to: "/verified-contracts", label: "Verified Contracts", icon: CheckCircle },
      { to: "/internal-txs", label: "Internal TXs", icon: GitBranch },
    ]
  },
  {
    label: "Network",
    items: [
      { to: "/supply", label: "Supply", icon: Coins },
      { to: "/parameters", label: "Parameters", icon: Settings2 },
      { to: "/consensus", label: "Consensus", icon: Radio },
      { to: "/ibc", label: "IBC", icon: Network },
      { to: "/cosmwasm", label: "CosmWasm", icon: FileCode2 },
      { to: "/state-sync", label: "State Sync", icon: RefreshCw },
      { to: "/widgets", label: "Widgets", icon: AppWindow },
    ]
  }
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 glass-strong border-r border-border/60 flex flex-col transition-[width] duration-300",
        collapsed ? "w-[76px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/60">
        <Link to="/" className="flex items-center gap-3 group">
          <img src={NETWORK.logo} alt="QIE" className="w-7 h-7 rounded-full ring-1 ring-primary/40 group-hover:ring-primary transition" />
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-semibold tracking-tight gradient-text text-md">QIE Explorer</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Mainnet</div>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            {!collapsed && (
              <div className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map(({ to, label, icon: Icon }) => {
                const active = pathname === to || (to === "/dashboard" && pathname === "/");
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative",
                      active
                        ? "bg-gradient-to-r from-primary/20 to-accent/20 text-white shadow-[inset_0_0_0_1px_rgba(216,79,184,0.25)]"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-gradient-to-b from-primary to-accent" />
                    )}
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && <span className="font-medium">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border/60">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-white py-2 rounded-lg hover:bg-white/5 transition"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
