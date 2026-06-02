import { createFileRoute } from "@tanstack/react-router";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/widgets")({
  head: () => ({ meta: [{ title: "Widgets — QIE Explorer" }] }),
  component: WidgetsPage,
});

const widgets = [
  { id: "height", title: "Chain Height", desc: "Live block height counter" },
  { id: "validators", title: "Validator Set", desc: "Active validators count" },
  { id: "price", title: "QIE Price", desc: "Current market price (placeholder)" },
  { id: "apr", title: "Staking APR", desc: "Live staking APR" },
  { id: "supply", title: "Total Supply", desc: "Total QIE supply on chain" },
];

function WidgetsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const base = typeof window !== "undefined" ? window.location.origin : "https://explorer.qie.digital";

  function snippet(id: string) {
    return `<iframe src="${base}/embed/${id}" width="320" height="120" style="border:0;border-radius:14px"></iframe>`;
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Embeddable Widgets" sub="Drop QIE data into any website" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {widgets.map((w) => (
          <Card key={w.id}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">{w.title}</h3>
                <p className="text-xs text-muted-foreground">{w.desc}</p>
              </div>
            </div>
            <div className="glass rounded-xl p-6 mb-3 text-center bg-[linear-gradient(135deg,rgba(216,79,184,0.15),rgba(162,91,255,0.15))]">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{w.title}</div>
              <div className="text-3xl font-bold gradient-text mt-1">—</div>
              <div className="text-[10px] text-muted-foreground mt-1">QIE Mainnet</div>
            </div>
            <div className="relative">
              <pre className="text-[11px] font-mono p-3 rounded-lg bg-black/40 border border-border overflow-x-auto">{snippet(w.id)}</pre>
              <button onClick={() => { navigator.clipboard.writeText(snippet(w.id)); setCopied(w.id); setTimeout(() => setCopied(null), 1500); }}
                className="absolute top-2 right-2 glass rounded px-2 py-1 text-xs flex items-center gap-1">
                {copied === w.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
