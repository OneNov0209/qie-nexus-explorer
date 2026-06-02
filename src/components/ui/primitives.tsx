import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCard({
  label, value, sub, icon, accent = false,
}: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: boolean }) {
  return (
    <div className={cn(
      "glass rounded-2xl p-5 relative overflow-hidden group hover:border-primary/40 transition",
      accent && "ring-1 ring-primary/30"
    )}>
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition" />
      <div className="flex items-start justify-between relative">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && <div className="text-primary/80">{icon}</div>}
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums relative">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground relative">{sub}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass rounded-2xl p-5", className)}>{children}</div>;
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <img src="https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png"
        alt="" className="w-12 h-12 animate-pulse-glow rounded-full" />
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function ErrorState({ error }: { error: any }) {
  return (
    <div className="glass rounded-2xl p-6 border-destructive/30 text-sm">
      <div className="font-semibold text-destructive mb-1">Failed to load</div>
      <div className="text-xs text-muted-foreground break-all">{String(error?.message ?? error)}</div>
    </div>
  );
}

export function Pill({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "success" | "warning" | "danger" }) {
  const cls = {
    default: "bg-white/5 text-foreground",
    success: "bg-success/15 text-[oklch(0.85_0.15_155)]",
    warning: "bg-warning/15 text-[oklch(0.85_0.15_75)]",
    danger: "bg-destructive/15 text-[oklch(0.85_0.2_25)]",
  }[variant];
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium", cls)}>{children}</span>;
}
