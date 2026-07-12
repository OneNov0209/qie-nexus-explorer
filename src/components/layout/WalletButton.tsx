import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { ChevronDown, Wallet, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { shorten } from "@/lib/api";

const LOGOS = {
  qie: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png",
  metamask: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/metamask.png",
  keplr: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/keplr.jpg",
};

export function WalletButton() {
  const { evm, cosmos, disconnectEvm, disconnectCosmos } = useWallet();
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const isConnected = !!evm.address || !!cosmos.address;

  const connectQieWallet = async () => {
    setConnecting(true);
    try {
      const { connectQieWallet } = await import("@/lib/wallet");
      await connectQieWallet();
      toast.success("QIE Wallet connected!");
    } catch (error: any) {
      toast.error("Failed to connect", { description: error.message });
    } finally {
      setConnecting(false);
      setOpen(false);
    }
  };

  const connectMetaMask = async () => {
    setConnecting(true);
    try {
      const { connectMetaMask } = await import("@/lib/wallet");
      await connectMetaMask();
      toast.success("MetaMask connected!");
    } catch (error: any) {
      toast.error("Failed to connect", { description: error.message });
    } finally {
      setConnecting(false);
      setOpen(false);
    }
  };

  const connectKeplr = async () => {
    setConnecting(true);
    try {
      const { connectKeplr } = await import("@/lib/wallet");
      await connectKeplr();
      toast.success("Keplr connected!");
    } catch (error: any) {
      toast.error("Failed to connect", { description: error.message });
    } finally {
      setConnecting(false);
      setOpen(false);
    }
  };

  const disconnect = () => {
    if (evm.address) disconnectEvm();
    if (cosmos.address) disconnectCosmos();
    toast.info("Disconnected");
    setOpen(false);
  };

  if (isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-border/60 hover:border-violet-500/50 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium">
            {evm.address ? shorten(evm.address, 6, 4) : shorten(cosmos.address, 6, 4)}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-border/60 shadow-xl z-50 py-2">
              <div className="px-4 py-2 border-b border-border/30">
                <p className="text-xs text-muted-foreground">Connected</p>
                {evm.address && (
                  <p className="text-xs font-mono truncate">{evm.address}</p>
                )}
                {cosmos.address && (
                  <p className="text-xs font-mono truncate">{cosmos.address}</p>
                )}
              </div>
              <button
                onClick={disconnect}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={connecting}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
      >
        {connecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        Connect Wallet
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-card border border-border/60 shadow-xl z-50 py-2">
            <div className="px-4 py-2 border-b border-border/30">
              <p className="text-xs text-muted-foreground">Choose Wallet</p>
            </div>

            <button
              onClick={connectQieWallet}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-500/10 transition-colors"
            >
              <img 
                src={LOGOS.qie} 
                alt="QIE Wallet" 
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="text-left">
                <p className="text-sm font-medium">QIE Wallet</p>
                <p className="text-xs text-muted-foreground">Official QIE wallet - EVM + Cosmos</p>
              </div>
            </button>

            <button
              onClick={connectMetaMask}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-500/10 transition-colors"
            >
              <img 
                src={LOGOS.metamask} 
                alt="MetaMask" 
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="text-left">
                <p className="text-sm font-medium">MetaMask</p>
                <p className="text-xs text-muted-foreground">EVM wallet</p>
              </div>
            </button>

            <button
              onClick={connectKeplr}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-500/10 transition-colors"
            >
              <img 
                src={LOGOS.keplr} 
                alt="Keplr" 
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="text-left">
                <p className="text-sm font-medium">Keplr</p>
                <p className="text-xs text-muted-foreground">Cosmos wallet - Staking & governance</p>
              </div>
            </button>

            <div className="px-4 py-2 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Connect both for full access: QIE Wallet (EVM) + Keplr (Staking)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
