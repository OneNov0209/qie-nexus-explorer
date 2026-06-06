import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ValidatorAvatar } from "@/components/shared/ValidatorAvatar";
import { NETWORK } from "@/data/network";
import { formatQIE, shorten } from "@/lib/api";
import { toast } from "sonner";
import { delegate, undelegate, redelegate, withdrawAllRewards } from "@/lib/wallet-tx";
import {
  Gift, Loader2, Layers, ArrowRightLeft, TrendingDown, TrendingUp,
  Coins, Zap, Clock, CheckCircle, XCircle, Percent
} from "lucide-react";

type TabType = "delegate" | "redelegate" | "undelegate" | "claim";

interface StakingModalProps {
  open: boolean;
  onClose: () => void;
  validatorAddress: string;
  validatorMoniker: string;
  validatorIdentity?: string;
  validatorCommission: number;
  validatorAPR: number;
  userStake: number;
  userBalance: number;
  userRewards: number;
  allValidators: { address: string; moniker: string; identity?: string }[];
  onSuccess?: () => void;
}

export function StakingModal({
  open, onClose, validatorAddress, validatorMoniker, validatorIdentity,
  validatorCommission, validatorAPR, userStake, userBalance, userRewards,
  allValidators, onSuccess,
}: StakingModalProps) {
  const [tab, setTab] = useState<TabType>("delegate");
  const [amount, setAmount] = useState("");
  const [dstValidator, setDstValidator] = useState("");
  const [busy, setBusy] = useState(false);
  const [percentage, setPercentage] = useState(0);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "delegate", label: "Delegate", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "redelegate", label: "Redelegate", icon: <ArrowRightLeft className="w-4 h-4" /> },
    { key: "undelegate", label: "Undelegate", icon: <TrendingDown className="w-4 h-4" /> },
    { key: "claim", label: "Claim", icon: <Gift className="w-4 h-4" /> },
  ];

  const maxAmount = tab === "delegate" ? userBalance : tab === "undelegate" || tab === "redelegate" ? userStake : 0;
  const estimatedFee = 0.00625; // ~0.00625 QIE
  const estimatedRewards = tab === "delegate" ? (Number(amount || 0) * validatorAPR / 100 / 365) : 0;

  function setPercentageAmount(pct: number) {
    setPercentage(pct);
    if (maxAmount > 0) {
      setAmount((maxAmount * pct / 100).toFixed(4));
    }
  }

  function setAmountManual(val: string) {
    setAmount(val);
    if (maxAmount > 0 && Number(val) > 0) {
      setPercentage(Math.min(100, (Number(val) / maxAmount) * 100));
    } else {
      setPercentage(0);
    }
  }

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    if (tab === "redelegate" && !dstValidator) return toast.error("Select destination validator");
    setBusy(true);
    try {
      let res;
      if (tab === "delegate") res = await delegate(validatorAddress, amount);
      else if (tab === "undelegate") res = await undelegate(validatorAddress, amount);
      else if (tab === "redelegate") res = await redelegate(validatorAddress, dstValidator, amount);
      toast.success(`${tab.charAt(0).toUpperCase() + tab.slice(1)} success!`, {
        description: `Tx: ${shorten(res.transactionHash, 10, 8)}`,
      });
      onClose();
      onSuccess?.();
    } catch (e: any) {
      toast.error(`${tab} failed`, { description: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleClaim() {
    setBusy(true);
    try {
      const res = await withdrawAllRewards([validatorAddress]);
      toast.success("Rewards claimed!", {
        description: `Tx: ${shorten(res.transactionHash, 10, 8)}`,
      });
      onClose();
      onSuccess?.();
    } catch (e: any) {
      toast.error("Claim failed", { description: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ValidatorAvatar identity={validatorIdentity} moniker={validatorMoniker} size="md" />
            <div>
              <DialogTitle className="text-lg">{validatorMoniker}</DialogTitle>
              <DialogDescription className="text-xs">
                Commission: {(validatorCommission * 100).toFixed(1)}% · APR: {validatorAPR.toFixed(2)}%
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setAmount(""); setPercentage(0); }}
              disabled={t.key === "redelegate" && userStake <= 0}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all font-medium ${
                tab === t.key
                  ? "bg-violet-500 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground disabled:opacity-30"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4 pt-2">
          {/* Validator Info */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">My Stake</div>
              <div className="font-bold text-sm">{formatQIE(userStake, 4)}</div>
              <div className="text-[10px] text-muted-foreground">{NETWORK.symbol}</div>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">My Balance</div>
              <div className="font-bold text-sm">{formatQIE(userBalance, 4)}</div>
              <div className="text-[10px] text-muted-foreground">{NETWORK.symbol}</div>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Rewards</div>
              <div className="font-bold text-sm text-pink-400">{formatQIE(userRewards, 6)}</div>
              <div className="text-[10px] text-muted-foreground">{NETWORK.symbol}</div>
            </div>
          </div>

          {/* Redelegate - Destination Validator */}
          {tab === "redelegate" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Destination Validator</label>
              <select
                value={dstValidator}
                onChange={(e) => setDstValidator(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm focus:border-violet-500/50 focus:outline-none transition-colors"
              >
                <option value="">Select validator...</option>
                {allValidators
                  .filter((v) => v.address !== validatorAddress)
                  .map((v) => (
                    <option key={v.address} value={v.address}>
                      {v.moniker || shorten(v.address, 10, 6)}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Amount Input (for delegate/redelegate/undelegate) */}
          {tab !== "claim" && (
            <>
              <div>
                <label className="text-xs text-muted-foreground flex justify-between mb-1">
                  <span>Amount ({NETWORK.symbol})</span>
                  <span className="text-muted-foreground/70">
                    {tab === "delegate" ? `Available: ${formatQIE(maxAmount, 4)}` : `Staked: ${formatQIE(maxAmount, 4)}`}
                  </span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={(e) => setAmountManual(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm focus:border-violet-500/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Percentage Slider */}
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setPercentageAmount(pct)}
                      className={`flex-1 text-[11px] py-1.5 rounded-lg transition-all font-medium ${
                        percentage === pct
                          ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => setPercentageAmount(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full bg-muted/50 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500"
                />
              </div>
            </>
          )}

          {/* Claim */}
          {tab === "claim" && (
            <div className="rounded-xl bg-pink-500/5 border border-pink-500/20 p-4 text-center">
              <Gift className="w-10 h-10 text-pink-400 mx-auto mb-2" />
              <p className="font-bold text-lg text-pink-400">{formatQIE(userRewards, 6)} {NETWORK.symbol}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending rewards to claim</p>
            </div>
          )}

          {/* Fee & Rewards Estimate */}
          {tab !== "claim" && amount && Number(amount) > 0 && (
            <div className="rounded-xl bg-muted/30 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Coins className="w-3 h-3" /> Amount</span>
                <span className="font-medium">{Number(amount).toFixed(4)} {NETWORK.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Zap className="w-3 h-3" /> Est. Fee</span>
                <span className="font-medium">~{estimatedFee} {NETWORK.symbol}</span>
              </div>
              {tab === "delegate" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Percent className="w-3 h-3" /> Est. Daily Reward</span>
                  <span className="font-medium text-emerald-400">~{estimatedRewards.toFixed(6)} {NETWORK.symbol}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Unbonding</span>
                <span className="font-medium">14 days</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border/60 px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors"
          >
            Cancel
          </button>
          {tab === "claim" ? (
            <button
              onClick={handleClaim}
              disabled={busy || userRewards <= 0}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-pink-500/25 transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              Claim Rewards
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={busy || !amount || Number(amount) <= 0}
              className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : tab === "delegate" ? <TrendingUp className="w-4 h-4" /> : tab === "redelegate" ? <ArrowRightLeft className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {tab === "delegate" ? "Delegate" : tab === "redelegate" ? "Redelegate" : "Undelegate"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
