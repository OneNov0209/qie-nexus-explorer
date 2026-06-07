import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { useState } from "react";
import { Copy, Check, Code2, ExternalLink, Gauge } from "lucide-react";
import { cosmos, evmRpc, formatQIE } from "@/lib/api";
import { NETWORK } from "@/data/network";

export const Route = createFileRoute("/widgets")({
  head: () => ({ meta: [{ title: "Widgets — QIE Explorer" }] }),
  component: WidgetsPage,
});

type W = { id: "height" | "validators" | "price" | "apr" | "supply"; title: string; desc: string; icon: React.ReactNode };

const widgets: W[] = [
  { id: "height", title: "Chain Height", desc: "Live block height counter", icon: "📦" },
  { id: "validators", title: "Validator Set", desc: "Active validators count", icon: "👥" },
  { id: "price", title: "QIE Price", desc: "Live market price", icon: "💎" },
  { id: "apr", title: "Staking APR", desc: "Estimated annual return", icon: "📈" },
  { id: "supply", title: "Total Supply", desc: "Circulating QIE supply", icon: "🪙" },
];

function useLiveStats() {
  return useQuery({
    queryKey: ["widget-stats"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const [status, vals, pool, supply, annual, evmBlock, priceRes] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.validators().catch(() => null),
        cosmos.stakingPool().catch(() => null),
        cosmos.supply().catch(() => null),
        cosmos.annualProvisions().catch(() => "0"),
        evmRpc<string>("eth_blockNumber").catch(() => "0x0"),
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=qie&vs_currencies=usd").then(r => r.json()).catch(() => null),
      ]);
      const bonded = Number(pool?.bonded_tokens ?? 0);
      const apr = bonded ? (Number(annual) / bonded) * 100 : 0;
      return {
        height: Number(status?.sync_info?.latest_block_height ?? 0),
        evmHeight: parseInt(evmBlock ?? "0x0", 16),
        validators: (vals?.validators ?? []).length,
        activeValidators: (vals?.validators ?? []).filter((v: any) => v.status === "BOND_STATUS_BONDED").length,
        supply: supply?.find((s: any) => s.denom === NETWORK.denom)?.amount ?? "0",
        apr,
        price: priceRes?.qie?.usd || 0,
      };
    },
  });
}

const PRESETS = [
  { label: "S", w: 260, h: 100 },
  { label: "M", w: 340, h: 130 },
  { label: "L", w: 440, h: 170 },
];

function WidgetsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>(
    Object.fromEntries(widgets.map((w) => [w.id, PRESETS[1]]))
  );
  const base = typeof window !== "undefined" ? window.location.origin : "https://qie.explorer.onenov.xyz";
  const { data: stats } = useLiveStats();

  function snippet(w: W) {
    const s = sizes[w.id];
    return `<iframe src="${base}/embed/${w.id}" width="${s.w}" height="${s.h}" frameborder="0" style="border:0;border-radius:14px;overflow:hidden;background:transparent"></iframe>`;
  }

  function renderValue(id: W["id"]) {
    if (!stats) return "—";
    if (id === "height") return `#${stats.height.toLocaleString()}`;
    if (id === "validators") return `${stats.activeValidators} / ${stats.validators}`;
    if (id === "apr") return `${stats.apr.toFixed(2)}%`;
    if (id === "supply") return `${formatQIE(stats.supply, 0)}`;
    if (id === "price") return stats.price ? `$${stats.price.toFixed(4)}` : "$—";
    return "—";
  }

  return (
    <div className="space-y-6 pb-8">
      <SectionTitle 
        title="Embeddable Widgets" 
        sub="Add live QIE data to any website. Copy the iframe snippet below." 
        icon={<Code2 className="w-5 h-5 text-violet-500" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {widgets.map((w) => {
          const s = sizes[w.id];
          const snippetCode = snippet(w);

          return (
            <Card key={w.id}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="text-lg">{w.icon}</span> {w.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{w.desc}</p>
                </div>
                <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setSizes((x) => ({ ...x, [w.id]: preset }))}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                        s.w === preset.w
                          ? "bg-violet-500 text-white shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Size Inputs */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Width (px)</label>
                  <input
                    type="number"
                    min={200}
                    max={800}
                    value={s.w}
                    onChange={(e) => setSizes((x) => ({ ...x, [w.id]: { ...s, w: Number(e.target.value) } }))}
                    className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:border-violet-500/50 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Height (px)</label>
                  <input
                    type="number"
                    min={80}
                    max={500}
                    value={s.h}
                    onChange={(e) => setSizes((x) => ({ ...x, [w.id]: { ...s, h: Number(e.target.value) } }))}
                    className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:border-violet-500/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Preview */}
              <div
                className="relative rounded-2xl flex flex-col items-center justify-center mb-4 mx-auto overflow-hidden border-2 border-border/40"
                style={{ width: Math.min(s.w, 440), height: s.h, maxWidth: "100%" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-cyan-500/10" />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 opacity-50" />
                <div className="relative text-center">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{w.title}</div>
                  <div className="text-3xl font-bold gradient-text tabular-nums">{renderValue(w.id)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    QIE Mainnet · Live
                  </div>
                </div>
              </div>

              {/* Snippet */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Embed Code</span>
                  <span className="text-[10px] text-muted-foreground">{s.w}×{s.h}</span>
                </div>
                <pre className="text-[11px] font-mono p-4 rounded-xl bg-muted/40 border border-border/40 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground leading-relaxed">
                  {snippetCode}
                </pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(snippetCode); setCopied(w.id); setTimeout(() => setCopied(null), 1500); }}
                  className="absolute bottom-3 right-3 glass rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-violet-500/20 transition-colors"
                >
                  {copied === w.id ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                  )}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
