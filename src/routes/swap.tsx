import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet";
import { TOKENS, Token, getToken } from "@/data/tokens";
import { getPairPrice } from "@/lib/subgraph";
import { Card, SectionTitle, Loading } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ArrowUpDown, Loader2, Settings, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/swap")({
  head: () => ({ meta: [{ title: "Swap — QIE Explorer" }] }),
  component: SwapPage,
});

function SwapPage() {
  const { isConnected, address } = useWallet();
  const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0]); // QIE
  const [tokenOut, setTokenOut] = useState<Token>(TOKENS[1]); // wUSDC
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);

  // Ambil harga pair dari Subgraph
  const { data: pairData, isLoading: isPriceLoading } = useQuery({
    queryKey: ["pair-price", tokenIn.address, tokenOut.address],
    queryFn: () => getPairPrice(tokenIn.address, tokenOut.address),
    refetchInterval: 10000,
    enabled: !!tokenIn.address && !!tokenOut.address,
  });

  // Hitung quote saat amount berubah
  useEffect(() => {
    if (!amountIn || Number(amountIn) <= 0 || !pairData) {
      setAmountOut("");
      return;
    }

    const price = tokenIn.isNative 
      ? Number(pairData.token0Price) 
      : Number(pairData.token1Price);
    
    const result = Number(amountIn) * price;
    setAmountOut(result.toString());
  }, [amountIn, pairData, tokenIn]);

  function handleSwapTokens() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn("");
    setAmountOut("");
  }

  function setMaxAmount() {
    // Sementara pakai 1000 sebagai dummy, nanti diisi dari balance real
    setAmountIn("1000");
  }

  async function handleSwap() {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }
    if (!amountIn || Number(amountIn) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      // Sementara simulasi sukses
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Swap simulated! (Router address needed for real swap)");
      setAmountIn("");
      setAmountOut("");
    } catch (error: any) {
      toast.error("Swap failed", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center p-10">
          <div className="mx-auto w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mb-4">
            <ArrowUpDown className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Connect Wallet to Swap</h2>
          <p className="text-muted-foreground mb-6">Connect your EVM wallet to start swapping on QIEDEX</p>
          <Button className="btn-primary w-full">Connect Wallet</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <SectionTitle title="Swap" icon={<ArrowUpDown className="w-5 h-5 text-violet-400" />} />
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className="text-muted-foreground hover:text-white transition-colors p-2 rounded-lg hover:bg-muted/30"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Settings */}
          {showSettings && (
            <div className="mb-4 p-3 rounded-xl bg-muted/30 border border-border/60">
              <label className="text-xs text-muted-foreground block mb-2">Slippage Tolerance</label>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      slippage === s
                        ? "bg-violet-500 text-white"
                        : "bg-muted/50 text-muted-foreground hover:text-white"
                    }`}
                  >
                    {s}%
                  </button>
                ))}
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded-lg bg-muted/50 text-xs text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
                  min={0.01}
                  max={5}
                  step={0.01}
                />
              </div>
            </div>
          )}

          {/* Token In */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">From</span>
              <span className="text-xs text-muted-foreground">
                Balance: 1,000.00 {tokenIn.symbol}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="flex-1 text-2xl font-bold border-0 bg-transparent focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <TokenSelectorButton
                token={tokenIn}
                onSelect={setTokenIn}
                tokens={TOKENS}
              />
            </div>
            <button
              onClick={setMaxAmount}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-1"
            >
              Max
            </button>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleSwapTokens}
              className="p-2 rounded-full bg-card border border-border/60 hover:border-violet-500/50 transition-colors shadow-lg hover:shadow-violet-500/20"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* Token Out */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/60 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">To</span>
              <span className="text-xs text-muted-foreground">
                Balance: 500.00 {tokenOut.symbol}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="text"
                placeholder="0.0"
                value={isPriceLoading ? "..." : amountOut}
                readOnly
                className="flex-1 text-2xl font-bold border-0 bg-transparent focus:outline-none p-0"
              />
              <TokenSelectorButton
                token={tokenOut}
                onSelect={setTokenOut}
                tokens={TOKENS}
              />
            </div>
          </div>

          {/* Price Info */}
          {amountIn && Number(amountIn) > 0 && amountOut && !isPriceLoading && (
            <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-medium">
                  1 {tokenIn.symbol} = {(Number(amountOut) / Number(amountIn)).toFixed(6)} {tokenOut.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Price Impact</span>
                <span className="font-medium text-emerald-400">&lt; 0.01%</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Minimum Received</span>
                <span className="font-medium">
                  {(Number(amountOut) * (1 - slippage / 100)).toFixed(6)} {tokenOut.symbol}
                </span>
              </div>
            </div>
          )}

          {/* Info jika pair tidak ditemukan */}
          {pairData === null && amountIn && Number(amountIn) > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400">Pair not found on QIEDEX</span>
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={isLoading || !amountIn || Number(amountIn) <= 0 || !pairData}
            className="w-full mt-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl py-3 font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isLoading 
              ? "Swapping..." 
              : !pairData && amountIn 
                ? "Pair not available" 
                : `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`}
          </Button>

          {/* Note */}
          <div className="mt-3 text-center text-[10px] text-muted-foreground">
            ⚠️ Swap is currently in simulation mode. Router address needed for live transactions.
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function TokenSelectorButton({
  token,
  onSelect,
  tokens,
}: {
  token: Token;
  onSelect: (t: Token) => void;
  tokens: Token[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/60 hover:border-violet-500/50 transition-colors"
      >
        {token.logo && (
          <img 
            src={token.logo} 
            alt={token.symbol} 
            className="w-6 h-6 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <span className="font-medium">{token.symbol}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-border/60 shadow-xl z-50 py-2 max-h-64 overflow-y-auto">
            {tokens.map((t) => (
              <button
                key={t.address}
                onClick={() => { onSelect(t); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors text-left ${
                  t.address === token.address ? "bg-muted/20" : ""
                }`}
              >
                {t.logo && (
                  <img 
                    src={t.logo} 
                    alt={t.symbol} 
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <div className="font-medium text-sm">{t.symbol}</div>
                  <div className="text-xs text-muted-foreground">{t.name}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
