import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cosmos, evmRpc, formatQIE } from "@/lib/api";
import { NETWORK } from "@/data/network";

export const Route = createFileRoute("/widgets")({
  head: () => ({ meta: [{ title: "Widgets — QIE Explorer" }] }),
  component: WidgetsPage,
});

type W = { id: "height" | "validators" | "price" | "apr" | "supply"; title: string; desc: string };

const widgets: W[] = [
  { id: "height", title: "Chain Height", desc: "Live block height" },
  { id: "validators", title: "Validator Set", desc: "Active validators" },
  { id: "price", title: "QIE Price", desc: "Market price (placeholder)" },
  { id: "apr", title: "Staking APR", desc: "Live staking APR" },
  { id: "supply", title: "Total Supply", desc: "Total QIE supply" },
];

function useLiveStats() {
  return useQuery({
    queryKey: ["widget-stats"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const [status, vals, pool, supply, annual, evmBlock] = await Promise.all([
        cosmos.status().catch(() => null),
        cosmos.validators().catch(() => null),
        cosmos.stakingPool().catch(() => null),
        cosmos.supply().catch(() => null),
        cosmos.annualProvisions().catch(() => "0"),
        evmRpc<string>("eth_blockNumber").catch(() => "0x0"),
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
        price: 0,
      };
    },
  });
}

const SIZES = [
  { label: "Small",  w: 280, h: 110 },
  { label: "Medium", w: 360, h: 140 },
  { label: "Large",  w: 460, h: 180 },
];

function WidgetsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>(
    Object.fromEntries(widgets.map((w) => [w.id, SIZES[1]]))
  );
  const base = typeof window !== "undefined" ? window.location.origin : "https://explorer.qie.digital";
  const { data: stats } = useLiveStats();

  function snippet(w: W) {
    const s = sizes[w.id];
    return `<iframe src="${base}/embed/${w.id}" width="${s.w}" height="${s.h}" frameborder="0" style="border:0;border-radius:14px;overflow:hidden"></iframe>`;
  }

  function renderValue(id: W["id"]) {
    if (!stats) return "—";
    if (id === "height") return stats.height.toLocaleString();
    if (id === "validators") return `${stats.activeValidators}/${stats.validators}`;
    if (id === "apr") return `${stats.apr.toFixed(2)}%`;
    if (id === "supply") return `${formatQIE(stats.supply, 0)} ${NETWORK.symbol}`;
    if (id === "price") return "$—";
    return "—";
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Embeddable Widgets" sub="Drop QIE data into any website. Live values update automatically." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {widgets.map((w) => {
          const s = sizes[w.id];
          return (
            <Card key={w.id}>
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <h3 className="font-semibold">{w.title}</h3>
                  <p className="text-xs text-muted-foreground">{w.desc}</p>
                </div>
                <div className="flex gap-1">
                  {SIZES.map((sz) => (
                    <button
                      key={sz.label}
                      onClick={() => setSizes((x) => ({ ...x, [w.id]: sz }))}
                      className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md transition ${s.w === sz.w ? "bg-primary text-primary-foreground" : "glass hover:bg-white/10"}`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <label className="flex items-center gap-2">
                  <span className="text-muted-foreground w-12">Width</span>
                  <input type="number" min={200} max={800} value={s.w}
                    onChange={(e) => setSizes((x) => ({ ...x, [w.id]: { ...s, w: Number(e.target.value) } }))}
                    className="flex-1 glass rounded-md px-2 py-1" />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-muted-foreground w-12">Height</span>
                  <input type="number" min={80} max={500} value={s.h}
                    onChange={(e) => setSizes((x) => ({ ...x, [w.id]: { ...s, h: Number(e.target.value) } }))}
                    className="flex-1 glass rounded-md px-2 py-1" />
                </label>
              </div>

              <div
                className="glass rounded-xl flex flex-col items-center justify-center mb-3 bg-[linear-gradient(135deg,rgba(216,79,184,0.15),rgba(162,91,255,0.15))] mx-auto"
                style={{ width: s.w, height: s.h, maxWidth: "100%" }}
              >
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{w.title}</div>
                <div className="text-3xl font-bold gradient-text mt-1 tabular-nums">{renderValue(w.id)}</div>
                <div className="text-[10px] text-muted-foreground mt-1">QIE Mainnet</div>
              </div>

              <div className="relative">
                <pre className="text-[11px] font-mono p-3 rounded-lg bg-black/40 border border-border overflow-x-auto whitespace-pre-wrap break-all text-white/80">{snippet(w)}</pre>
                <button onClick={() => { navigator.clipboard.writeText(snippet(w)); setCopied(w.id); setTimeout(() => setCopied(null), 1500); }}
                  className="absolute top-2 right-2 glass rounded px-2 py-1 text-xs flex items-center gap-1">
                  {copied === w.id ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
