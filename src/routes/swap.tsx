import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet";
import { TOKENS, Token, WQIE_ADDRESS } from "@/data/tokens";
import { getPairPrice } from "@/lib/subgraph";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { ChevronDown, ArrowUpDown, Loader2, Settings, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/swap")({
  head: () => ({ meta: [{ title: "Swap — QIE Explorer" }] }),
  component: SwapPage,
});

function SwapPage() {
  const isConnected = useWallet((state) => !!state.evm.address);
  const address = useWallet((state) => state.evm.address);
  
  const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(TOKENS[1]);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [balanceIn, setBalanceIn] = useState("0");
  const [balanceOut, setBalanceOut] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const { connectMetaMask } = await import("@/lib/wallet");
      await connectMetaMask();
      toast.success("Wallet connected!");
    } catch (error: any) {
      toast.error("Failed to connect", { description: error.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchBalances = async () => {
    if (!address) return;
    try {
      const { getTokenBalance, getNativeBalance } = await import("@/lib/evm-contracts");
      const balIn = tokenIn.isNative
        ? await getNativeBalance(address)
        : await getTokenBalance(address, tokenIn.address);
      const balOut = tokenOut.isNative
        ? await getNativeBalance(address)
        : await getTokenBalance(address, tokenOut.address);
      setBalanceIn(balIn);
      setBalanceOut(balOut);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    }
  };

  const { data: pairData, isLoading: isPriceLoading } = useQuery({
    queryKey: ["pair-price", tokenIn.address, tokenOut.address],
    queryFn: () => getPairPrice(tokenIn.address, tokenOut.address),
    refetchInterval: 10000,
    enabled: !!tokenIn.address && !!tokenOut.address,
  });

  useEffect(() => {
    if (address) {
      fetchBalances();
    }
  }, [address, tokenIn, tokenOut]);

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
    setAmountIn(balanceIn);
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
    if (Number(amountIn) > Number(balanceIn)) {
      toast.error("Insufficient balance");
      return;
    }

    setIsLoading(true);
    try {
      const { executeSwap, wrapQIE, unwrapQIE, getAllowance, approveToken } = await import("@/lib/evm-contracts");

      // Case 1: QIE → wQIE (Wrap)
      if (tokenIn.isNative && tokenOut.address === WQIE_ADDRESS) {
        await wrapQIE(amountIn);
        toast.success("QIE wrapped to wQIE!");
        setAmountIn("");
        setAmountOut("");
        await fetchBalances();
        setIsLoading(false);
        return;
      }

      // Case 2: wQIE → QIE (Unwrap)
      if (tokenIn.address === WQIE_ADDRESS && tokenOut.isNative) {
        await unwrapQIE(amountIn);
        toast.success("wQIE unwrapped to QIE!");
        setAmountIn("");
        setAmountOut("");
        await fetchBalances();
        setIsLoading(false);
        return;
      }

      // Case 3: Native QIE → Other token (Auto-wrap + Swap)
      if (tokenIn.isNative && !tokenOut.isNative && tokenOut.address !== WQIE_ADDRESS) {
        toast.info("Wrapping QIE to wQIE first...");
        await wrapQIE(amountIn);
        toast.success("QIE wrapped to wQIE! Proceeding to swap...");
        
        // Update tokenIn to wQIE for swap
        const wqieToken = TOKENS.find(t => t.address === WQIE_ADDRESS);
        if (!wqieToken) throw new Error("wQIE token not found");
        
        const { executeSwap: swapAfterWrap } = await import("@/lib/evm-contracts");
        const result = await swapAfterWrap(amountIn, WQIE_ADDRESS, tokenOut.address, slippage);
        toast.success("Swap successful!", { description: `Tx: ${result.hash.slice(0, 16)}...` });
        setAmountIn("");
        setAmountOut("");
        await fetchBalances();
        setIsLoading(false);
        return;
      }

      // Case 4: Other token → Native QIE (Swap + Auto-unwrap)
      if (!tokenIn.isNative && tokenOut.isNative && tokenIn.address !== WQIE_ADDRESS) {
        toast.info("Swapping to wQIE first...");
        
        // Check allowance
        const allowance = await getAllowance(address, tokenIn.address);
        if (Number(allowance) < Number(amountIn)) {
          toast.info("Approving token...");
          await approveToken(tokenIn.address, amountIn);
          toast.success("Token approved!");
        }
        
        // Swap to wQIE first
        const { executeSwap: swapToWQIE } = await import("@/lib/evm-contracts");
        const result = await swapToWQIE(amountIn, tokenIn.address, WQIE_ADDRESS, slippage);
        
        toast.info("Unwrapping wQIE to QIE...");
        await unwrapQIE(amountIn);
        toast.success("Swap successful!", { description: `Tx: ${result.hash.slice(0, 16)}...` });
        setAmountIn("");
        setAmountOut("");
        await fetchBalances();
        setIsLoading(false);
        return;
      }

      // Case 5: Regular token-to-token swap (including wQIE)
      if (!tokenIn.isNative && !tokenOut.isNative) {
        const allowance = await getAllowance(address, tokenIn.address);
        if (Number(allowance) < Number(amountIn)) {
          toast.info("Approving token...");
          await approveToken(tokenIn.address, amountIn);
          toast.success("Token approved!");
        }

        const result = await executeSwap(amountIn, tokenIn.address, tokenOut.address, slippage);
        toast.success("Swap successful!", { description: `Tx: ${result.hash.slice(0, 16)}...` });
        setAmountIn("");
        setAmountOut("");
        await fetchBalances();
        setIsLoading(false);
        return;
      }

      // Fallback: should never reach here
      toast.error("Unsupported swap pair");

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
          <button 
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-6 py-3 font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-bold">Swap</h2>
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className="text-muted-foreground hover:text-white transition-colors p-2 rounded-lg hover:bg-muted/30"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

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

          <div className="p-4 rounded-xl bg-muted/20 border border-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">From</span>
              <span className="text-xs text-muted-foreground">
                Balance: {Number(balanceIn).toFixed(4)} {tokenIn.symbol}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
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

          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleSwapTokens}
              className="p-2 rounded-full bg-card border border-border/60 hover:border-violet-500/50 transition-colors shadow-lg hover:shadow-violet-500/20"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border border-border/60 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">To</span>
              <span className="text-xs text-muted-foreground">
                Balance: {Number(balanceOut).toFixed(4)} {tokenOut.symbol}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
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

          {pairData === null && amountIn && Number(amountIn) > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400">Pair not found on QIEDEX</span>
            </div>
          )}

          <button
            onClick={handleSwap}
            disabled={isLoading || !amountIn || Number(amountIn) <= 0 || !pairData || Number(amountIn) > Number(balanceIn)}
            className="w-full mt-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl py-3 font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            {isLoading 
              ? "Processing..." 
              : Number(amountIn) > Number(balanceIn)
                ? "Insufficient balance"
                : !pairData && amountIn 
                  ? "Pair not available" 
                  : `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`}
          </button>

          <div className="mt-3 text-center text-[10px] text-muted-foreground">
            ⚠️ Auto-wrap/unwrap supported for QIE ↔ wQIE
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
