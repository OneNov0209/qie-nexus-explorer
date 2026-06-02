import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos, formatQIE } from "@/lib/api";
import { Card, SectionTitle, StatCard, Loading, ErrorState } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/supply")({
  head: () => ({ meta: [{ title: "Supply — QIE Explorer" }] }),
  component: SupplyPage,
});

function SupplyPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["supply"], refetchInterval: 30_000,
    queryFn: async () => {
      const [supply, pool, commPool] = await Promise.all([
        cosmos.supply(), cosmos.stakingPool(), cosmos.communityPool(),
      ]);
      return { supply, pool, commPool };
    },
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const total = Number(data?.supply?.find((s: any) => s.denom === NETWORK.denom)?.amount ?? 0);
  const bonded = Number(data?.pool?.bonded_tokens ?? 0);
  const notBonded = Number(data?.pool?.not_bonded_tokens ?? 0);
  const community = Number(data?.commPool?.find((c: any) => c.denom === NETWORK.denom)?.amount ?? 0);
  const circulating = total - bonded;

  const chart = [
    { name: "Bonded", value: bonded, color: "#D84FB8" },
    { name: "Circulating", value: Math.max(0, circulating - community), color: "#A25BFF" },
    { name: "Community Pool", value: community, color: "#F07DDB" },
    { name: "Not Bonded", value: notBonded, color: "#C46AE6" },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle title="Token Supply" sub={`${NETWORK.coin} distribution across the network`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Supply" value={formatQIE(total, 0)} sub={NETWORK.symbol} accent />
        <StatCard label="Circulating" value={formatQIE(circulating, 0)} sub={NETWORK.symbol} />
        <StatCard label="Bonded" value={formatQIE(bonded, 0)} sub={NETWORK.symbol} />
        <StatCard label="Community Pool" value={formatQIE(community, 0)} sub={NETWORK.symbol} />
      </div>
      <Card>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chart} dataKey="value" nameKey="name" outerRadius={120} innerRadius={70} paddingAngle={2}>
                {chart.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `${formatQIE(v, 0)} ${NETWORK.symbol}`}
                contentStyle={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
