import { useState } from "react";
import { Wallet, LogOut, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWallet, connectMetaMask, connectKeplr } from "@/lib/wallet";
import { NETWORK, WALLET_LOGOS } from "@/data/network";
import { shorten } from "@/lib/api";
import { toast } from "sonner";

export function WalletButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { evm, cosmos, disconnectEvm, disconnectCosmos } = useWallet();
  const connected = evm.address || cosmos.address;

  async function tryConnect(kind: "metamask" | "keplr" | "leap") {
    try {
      if (kind === "metamask") await connectMetaMask();
      else await connectKeplr(kind);
      toast.success(`Connected to ${kind}`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Connection failed");
    }
  }

  function copy(t: string) {
    navigator.clipboard.writeText(t);
    setCopied(t);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <>
      {!connected ? (
        <button onClick={() => setOpen(true)} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <Wallet className="w-4 h-4" /> Connect Wallet
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {evm.address && (
            <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
              <img src={WALLET_LOGOS.metamask} alt="" className="w-4 h-4" />
              <span className="font-mono">{shorten(evm.address)}</span>
              <span className="text-muted-foreground">{evm.balance} {NETWORK.symbol}</span>
              <button onClick={() => copy(evm.address!)} className="text-muted-foreground hover:text-white">
                {copied === evm.address ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button onClick={disconnectEvm} className="text-muted-foreground hover:text-destructive"><LogOut className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {cosmos.address && (
            <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
              <img src={WALLET_LOGOS.keplr} alt="" className="w-4 h-4" />
              <span className="font-mono">{shorten(cosmos.address)}</span>
              <button onClick={() => copy(cosmos.address!)} className="text-muted-foreground hover:text-white">
                {copied === cosmos.address ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button onClick={disconnectCosmos} className="text-muted-foreground hover:text-destructive"><LogOut className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {!evm.address && (
            <button onClick={() => setOpen(true)} className="glass rounded-xl px-3 py-2 text-sm hover:bg-white/10">+ EVM</button>
          )}
          {!cosmos.address && (
            <button onClick={() => setOpen(true)} className="glass rounded-xl px-3 py-2 text-sm hover:bg-white/10">+ Cosmos</button>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong border-border max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <img src={NETWORK.logo} className="w-10 h-10 rounded-full ring-1 ring-primary/40" alt="" />
              <div>
                <DialogTitle className="text-lg">Connect to QIE Mainnet</DialogTitle>
                <p className="text-xs text-muted-foreground">Choose your wallet provider</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground px-1">EVM Wallets</div>
            <WalletRow logo={WALLET_LOGOS.metamask} name="MetaMask" sub="Auto-adds QIE Network" onClick={() => tryConnect("metamask")} />
            <WalletRow logo={WALLET_LOGOS.metamask} name="Rabby Wallet" sub="EVM compatible" onClick={() => tryConnect("metamask")} />
            <WalletRow logo={WALLET_LOGOS.metamask} name="OKX Wallet" sub="EVM compatible" onClick={() => tryConnect("metamask")} />

            <div className="text-xs uppercase tracking-wider text-muted-foreground px-1 pt-3">Cosmos Wallets</div>
            <WalletRow logo={WALLET_LOGOS.keplr} name="Keplr" sub="Recommended" onClick={() => tryConnect("keplr")} />
            <WalletRow logo={WALLET_LOGOS.keplr} name="Leap Wallet" sub="Cosmos native" onClick={() => tryConnect("leap")} />
            <WalletRow logo={WALLET_LOGOS.keplr} name="Cosmostation" sub="Cosmos native" onClick={() => tryConnect("keplr")} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WalletRow({ logo, name, sub, onClick }: { logo: string; name: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl glass hover:bg-white/10 transition group">
      <img src={logo} alt={name} className="w-8 h-8" />
      <div className="text-left flex-1">
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition">Connect →</span>
    </button>
  );
}
