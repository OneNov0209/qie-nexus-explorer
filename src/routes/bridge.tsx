import { createFileRoute } from "@tanstack/react-router";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { ExternalLink, ArrowRightLeft, Shield, Clock, Coins, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { toast } from "sonner";

export const Route = createFileRoute("/bridge")({
  head: () => ({ meta: [{ title: "Bridge — QIE Explorer" }] }),
  component: BridgePage,
});

function BridgePage() {
  const isConnected = useWallet((state) => !!state.evm.address);
  const address = useWallet((state) => state.evm.address);
  const [isLoading, setIsLoading] = useState(false);

  const handleBridge = () => {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }
    setIsLoading(true);
    // Open bridge in new tab
    window.open("https://bridge.qie.digital", "_blank");
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 border border-border/60"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <ArrowRightLeft className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">QIE Bridge</h1>
            <p className="text-muted-foreground mt-1">
              Bridge assets between QIE Mainnet and other chains (Ethereum, BNB Chain)
            </p>
          </div>
        </div>
      </motion.div>

      {/* Network Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChainCard
          name="QIE Mainnet"
          icon="🔵"
          description="Native chain with near-zero fees"
          status="active"
        />
        <ChainCard
          name="Ethereum"
          icon="💎"
          description="ERC-20 tokens & wQIE"
          status="active"
        />
        <ChainCard
          name="BNB Chain"
          icon="🟡"
          description="BEP-20 tokens & wQIE"
          status="active"
        />
      </div>

      {/* Bridge Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle
            title="Bridge Assets"
            sub="Transfer tokens between chains securely"
            icon={<Shield className="w-5 h-5 text-cyan-400" />}
          />
        </div>

        {/* Bridge Status */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-400">Bridge is Operational</p>
            <p className="text-xs text-muted-foreground">All chains are connected and ready for transfer</p>
          </div>
        </div>

        {/* Bridge Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Coins className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Supported Assets</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs">QIE</span>
              <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs">wQIE</span>
              <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs">wUSDC</span>
              <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs">wUSDT</span>
              <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs">QIDEX</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Bridge Details</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-medium">~0.1%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Time</span>
                <span className="font-medium">5-10 minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min. Amount</span>
                <span className="font-medium">10 QIE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bridge Button */}
        <button
          onClick={handleBridge}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl py-3 font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          {isLoading ? "Opening Bridge..." : "Open QIE Bridge"}
        </button>

        <div className="mt-3 text-center text-[10px] text-muted-foreground">
          You will be redirected to the official QIE Bridge interface
        </div>
      </Card>

      {/* Bridge Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard
          title="How it Works"
          icon={<Shield className="w-5 h-5 text-cyan-400" />}
        >
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">1.</span>
              <span>Lock tokens on the source chain</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">2.</span>
              <span>Bridge validates the transaction</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">3.</span>
              <span>Mint wrapped tokens on the destination chain</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">4.</span>
              <span>Tokens arrive in your wallet</span>
            </li>
          </ul>
        </InfoCard>

        <InfoCard
          title="Important Notes"
          icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
        >
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>Bridge transactions are irreversible</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>Make sure you have enough gas on both chains</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>Always double-check the destination address</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>Use the official bridge link for security</span>
            </li>
          </ul>
        </InfoCard>
      </div>

      {/* Official Link */}
      <div className="text-center text-xs text-muted-foreground border-t border-border/60 pt-4">
        Official QIE Bridge:{" "}
        <a
          href="https://bridge.qie.digital"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          bridge.qie.digital
        </a>
        {" "}· {new Date().getFullYear()}
      </div>
    </div>
  );
}

function ChainCard({
  name,
  icon,
  description,
  status,
}: {
  name: string;
  icon: string;
  description: string;
  status: "active" | "inactive";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        {status === "active" && (
          <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Active
          </span>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </Card>
  );
}
