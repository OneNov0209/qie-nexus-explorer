import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";

export const Route = createFileRoute("/parameters")({
  head: () => ({ meta: [{ title: "Parameters — QIE Explorer" }] }),
  component: ParamsPage,
});

function ParamsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["params"],
    queryFn: async () => {
      const [staking, mint, slashing] = await Promise.all([
        cosmos.stakingParams(), cosmos.mintParams(), cosmos.slashingParams(),
      ]);
      return { staking, mint, slashing };
    },
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <SectionTitle title="Chain Parameters" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <P title="Staking" obj={data?.staking} />
        <P title="Mint" obj={data?.mint} />
        <P title="Slashing" obj={data?.slashing} />
      </div>
    </div>
  );
}

function P({ title, obj }: { title: string; obj: any }) {
  return (
    <Card>
      <h3 className="font-semibold mb-3">{title}</h3>
      <dl className="space-y-1.5 text-xs">
        {obj && Object.entries(obj).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-border/30 py-1">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-right break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
