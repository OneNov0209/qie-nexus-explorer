import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Loader2, Sun, Moon, Boxes, Hash, User, Layers } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WalletButton } from "./WalletButton";
import { useTheme } from "@/lib/theme";
import { cosmos, evmRpc, shorten } from "@/lib/api";

type Suggestion = {
  kind: "block" | "tx" | "validator" | "address" | "contract";
  label: string;
  sub?: string;
  to: { path: string; param?: string };
};

export function Topbar() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  // Preload validators for fast filter
  const { data: vals } = useQuery({
    queryKey: ["search-validators"],
    queryFn: () => cosmos.validators().then((r: any) => r?.validators ?? []),
    staleTime: 60_000,
  });

  // Live remote lookups (debounced via query key)
  const trimmed = q.trim();
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(trimmed), 220);
    return () => clearTimeout(t);
  }, [trimmed]);

  const { data: remote } = useQuery({
    queryKey: ["search-suggest", debounced],
    enabled: debounced.length >= 2,
    queryFn: async () => {
      const out: Suggestion[] = [];
      const v = debounced;

      if (/^\d+$/.test(v)) {
        // Block height — verify it exists
        try {
          const b = await cosmos.block(v);
          if (b?.block?.header?.height)
            out.push({ kind: "block", label: `Block #${Number(v).toLocaleString()}`, sub: b.block.header.time, to: { path: "/blocks/$height", param: v } });
        } catch { /* ignore */ }
      }
      if (/^0x[0-9a-fA-F]{64}$/.test(v) || /^[0-9A-Fa-f]{64}$/.test(v)) {
        const hash = v.replace(/^0x/, "");
        out.push({ kind: "tx", label: `Tx ${shorten(hash, 10, 8)}`, sub: "Cosmos / EVM transaction", to: { path: "/tx/$hash", param: hash } });
      }
      if (/^0x[0-9a-fA-F]{40}$/.test(v)) {
        try {
          const code = await evmRpc<string>("eth_getCode", [v, "latest"]);
          if (code && code !== "0x") out.push({ kind: "contract", label: `Contract ${shorten(v)}`, sub: "EVM contract", to: { path: "/tx/$hash", param: v } });
          else out.push({ kind: "address", label: `Address ${shorten(v)}`, sub: "EVM address", to: { path: "/tx/$hash", param: v } });
        } catch {
          out.push({ kind: "address", label: `Address ${shorten(v)}`, sub: "EVM address", to: { path: "/tx/$hash", param: v } });
        }
      }
      if (v.startsWith("qie1")) out.push({ kind: "address", label: `Address ${shorten(v)}`, sub: "Cosmos address", to: { path: "/staking" } });
      return out;
    },
    staleTime: 15_000,
  });

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!trimmed) return [];
    const lc = trimmed.toLowerCase();
    const valMatches: Suggestion[] = (vals ?? [])
      .filter((v: any) =>
        v.description?.moniker?.toLowerCase().includes(lc) ||
        v.operator_address?.toLowerCase().includes(lc)
      )
      .slice(0, 5)
      .map((v: any) => ({
        kind: "validator" as const,
        label: v.description?.moniker ?? shorten(v.operator_address),
        sub: shorten(v.operator_address, 12, 8),
        to: { path: "/staking" },
      }));
    return [...(remote ?? []), ...valMatches].slice(0, 8);
  }, [trimmed, vals, remote]);

  function go(s: Suggestion) {
    setOpen(false);
    setQ("");
    if (s.to.path === "/blocks/$height") navigate({ to: "/blocks/$height", params: { height: s.to.param! } });
    else if (s.to.path === "/tx/$hash") navigate({ to: "/tx/$hash", params: { hash: s.to.param! } });
    else navigate({ to: s.to.path as any });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (suggestions[active]) return go(suggestions[active]);
    const v = trimmed;
    if (!v) return;
    setBusy(true);
    if (/^\d+$/.test(v)) navigate({ to: "/blocks/$height", params: { height: v } });
    else if (/^0x[0-9a-fA-F]{64}$/.test(v) || /^[0-9A-Fa-f]{64}$/.test(v))
      navigate({ to: "/tx/$hash", params: { hash: v.replace(/^0x/, "") } });
    else if (v.startsWith("qievaloper")) navigate({ to: "/staking" });
    else navigate({ to: "/tx/$hash", params: { hash: v } });
    setTimeout(() => setBusy(false), 400);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === "Escape") setOpen(false);
  }

  const icon = (k: Suggestion["kind"]) =>
    k === "block" ? <Boxes className="w-4 h-4" /> :
    k === "tx" ? <Hash className="w-4 h-4" /> :
    k === "validator" ? <Layers className="w-4 h-4" /> :
    <User className="w-4 h-4" />;

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center gap-3 px-6 border-b border-border/60 backdrop-blur-xl bg-background/60">
      <form onSubmit={handleSubmit} ref={wrapRef as any} className="flex-1 max-w-2xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search blocks, txs, validators, addresses, contracts…"
          className="w-full glass rounded-xl pl-10 pr-20 py-2.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <kbd className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "⌘K"}
        </kbd>

        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 glass-strong rounded-xl overflow-hidden shadow-elegant z-50 animate-fade-in">
            {suggestions.map((s, i) => (
              <button
                type="button"
                key={`${s.kind}-${s.label}-${i}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(s)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition ${i === active ? "bg-primary/15" : "hover:bg-white/5"}`}
              >
                <span className="text-primary/80">{icon(s.kind)}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{s.label}</span>
                  {s.sub && <span className="text-[11px] text-muted-foreground truncate block">{s.sub}</span>}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.kind}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="relative glass rounded-full w-14 h-8 flex items-center transition hover:ring-2 hover:ring-primary/40"
      >
        <span
          className={`absolute top-1 left-1 w-6 h-6 rounded-full grid place-items-center bg-gradient-to-br from-primary to-accent text-white transition-transform shadow-md ${theme === "light" ? "translate-x-6" : ""}`}
        >
          {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </span>
        <Sun className="w-3.5 h-3.5 text-muted-foreground absolute left-1.5 opacity-60" />
        <Moon className="w-3.5 h-3.5 text-muted-foreground absolute right-1.5 opacity-60" />
      </button>

      <WalletButton />
    </header>
  );
}
