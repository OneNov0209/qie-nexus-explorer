import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cosmos } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";

export const Route = createFileRoute("/cosmwasm")({
  head: () => ({ meta: [{ title: "CosmWasm — QIE Explorer" }] }),
  component: CWPage,
});

function CWPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["wasm-codes"],
    queryFn: () => cosmos.wasmCodes().catch(() => ({ code_infos: [] })),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const codes = data?.code_infos ?? [];
  return (
    <div className="space-y-6">
      <SectionTitle title="CosmWasm" sub={`${codes.length} stored code IDs`} />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border/60">
            <tr><th className="text-left p-4">Code ID</th><th className="text-left p-4">Creator</th><th className="text-left p-4">Hash</th></tr>
          </thead>
          <tbody>
            {codes.map((c: any) => (
              <tr key={c.code_id} className="border-b border-border/40 hover:bg-white/5">
                <td className="p-4 font-mono">{c.code_id}</td>
                <td className="p-4 font-mono text-xs">{c.creator}</td>
                <td className="p-4 font-mono text-xs text-muted-foreground">{(c.data_hash ?? "").slice(0, 24)}…</td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No CosmWasm contracts stored.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
