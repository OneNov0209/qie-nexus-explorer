import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { WalletButton } from "./WalletButton";

export function Topbar() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    setBusy(true);
    // Heuristics: number => block, 0x... 64hex => evm tx, bech32 valoper => validator, otherwise tx hash
    if (/^\d+$/.test(v)) navigate({ to: "/blocks/$height", params: { height: v } });
    else if (/^0x[0-9a-fA-F]{64}$/.test(v) || /^[0-9A-Fa-f]{64}$/.test(v))
      navigate({ to: "/tx/$hash", params: { hash: v.replace(/^0x/, "") } });
    else if (v.startsWith("qievaloper")) navigate({ to: "/staking" });
    else navigate({ to: "/tx/$hash", params: { hash: v } });
    setTimeout(() => setBusy(false), 400);
  }

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center gap-3 px-6 border-b border-border/60 backdrop-blur-xl bg-background/60">
      <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by block height, tx hash, address, validator…"
          className="w-full glass rounded-xl pl-10 pr-20 py-2.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <kbd className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "⌘K"}
        </kbd>
      </form>
      <WalletButton />
    </header>
  );
}
