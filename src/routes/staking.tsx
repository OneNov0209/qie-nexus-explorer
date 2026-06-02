import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { useWallet } from "@/lib/wallet";
import { toast } from "sonner";
import { useState } from "react";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/staking")({
  head: () => ({ meta: [{ title: "Staking — QIE Explorer" }] }),
  component: StakingPage,
});

function StakingPage() {
  const [q, setQ] = useState("");
  const { cosmos: cw } = useWallet();
  const { data, isLoading, error } = useQuery({
    queryKey: ["validators"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [vals, pool, annual] = await Promise.all([
        cosmos.validators(), cosmos.stakingPool(), cosmos.annualProvisions().catch(() => "0"),
      ]);
      return { vals: vals?.validators ?? [], pool, annual };
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const bonded = Number(data?.pool?.bonded_tokens ?? 0);
  const apr = bonded ? (Number(data?.annual ?? 0) / bonded) * 100 : 0;

  const list = (data?.vals ?? [])
    .filter((v: any) => !q || v.description?.moniker?.toLowerCase().includes(q.toLowerCase()))
    .sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens));

  function act(type: string, val: any) {
    if (!cw.address) return toast.error("Connect a Cosmos wallet first");
    toast.info(`${type} flow for ${val.description?.moniker} — sign in your wallet`);
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Validators" sub={`${data?.vals?.length} validators · Network APR ~${apr.toFixed(2)}%`}
        action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="glass rounded-lg px-3 py-1.5 text-xs" />} />

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border/60">
              <tr>
                <th className="text-left p-4">#</th><th className="text-left p-4">Validator</th>
                <th className="text-right p-4">Voting Power</th><th className="text-right p-4">Commission</th>
                <th className="text-right p-4">APR</th><th className="text-left p-4">Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v: any, i: number) => {
                const comm = Number(v.commission?.commission_rates?.rate ?? 0);
                const vp = bonded ? (Number(v.tokens) / bonded) * 100 : 0;
                const vAPR = apr * (1 - comm);
                const bonded_ok = v.status === "BOND_STATUS_BONDED";
                return (
                  <tr key={v.operator_address} className="border-b border-border/40 hover:bg-white/5">
                    <td className="p-4 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="p-4">
                      <div className="font-medium">{v.description?.moniker ?? shorten(v.operator_address)}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        {v.description?.website && <a href={v.description.website} target="_blank" rel="noreferrer" className="hover:text-primary inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" />site</a>}
                        <span className="font-mono">{shorten(v.operator_address, 10, 8)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      <div>{formatQIE(v.tokens, 0)} {NETWORK.symbol}</div>
                      <div className="text-[11px] text-muted-foreground">{vp.toFixed(2)}%</div>
                    </td>
                    <td className="p-4 text-right tabular-nums">{(comm * 100).toFixed(2)}%</td>
                    <td className="p-4 text-right tabular-nums text-primary">{vAPR.toFixed(2)}%</td>
                    <td className="p-4">{bonded_ok ? <Pill variant="success">Active</Pill> : v.jailed ? <Pill variant="danger">Jailed</Pill> : <Pill variant="warning">Inactive</Pill>}</td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => act("Delegate", v)} className="btn-primary text-xs rounded-md px-2 py-1">Delegate</button>
                        <button onClick={() => act("Redelegate", v)} className="text-xs rounded-md px-2 py-1 glass hover:bg-white/10">Redelegate</button>
                        <button onClick={() => act("Undelegate", v)} className="text-xs rounded-md px-2 py-1 glass hover:bg-white/10">Undelegate</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
