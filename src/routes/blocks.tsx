import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { evm, hexToNum, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState } from "@/components/ui/primitives";
import { Boxes, Clock, ChevronRight } from "lucide-react";
import dayjs from "dayjs";

export const Route = createFileRoute("/blocks")({
  head: () => ({ meta: [{ title: "Blocks — QIE Explorer" }] }),
  component: BlocksLayout,
});

function BlocksLayout() {
  // Cek apakah ini halaman detail (ada height di URL)
  const { height } = Route.useParams() as any;

  // Kalau ada height, render detail page (child route)
  if (height) {
    return <Outlet />;
  }

  // Kalau tidak, render list blocks
  return <BlocksList />;
}

function BlocksList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["blocks-list-evm"],
    refetchInterval: 6000,
    queryFn: async () => {
      const latest = await evm.blockNumber();
      const count = 30;
      const start = Math.max(0, latest - count + 1);
      const heights = Array.from({ length: latest - start + 1 }, (_, i) => latest - i);
      const blocks = await Promise.all(heights.map((h) => evm.getBlock(h, false).catch(() => null)));
      return blocks.filter(Boolean);
    },
  });

  return (
    <div className="space-y-6 pb-8">
      <SectionTitle 
        title="Blocks" 
        sub={`Latest 30 blocks · Auto-refresh every 6s`}
        icon={<Boxes className="w-5 h-5 text-violet-500" />}
      />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map((b: any) => {
            const height = hexToNum(b.number);
            const ts = hexToNum(b.timestamp) * 1000;
            const gasUsed = b.gasUsed ? hexToNum(b.gasUsed) : 0;
            const gasLimit = b.gasLimit ? hexToNum(b.gasLimit) : 1;
            const gasPct = gasLimit > 0 ? ((gasUsed / gasLimit) * 100).toFixed(1) : "0";

            return (
              <Link
                key={b.hash}
                to="/blocks/$height"
                params={{ height: String(height) }}
                className="group relative rounded-xl border border-border/60 bg-card hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/0 via-violet-500/40 to-fuchsia-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center">
                        <Boxes className="w-4 h-4 text-violet-400" />
                      </span>
                      <span className="font-mono font-bold text-lg group-hover:text-violet-500 transition-colors">
                        #{height.toLocaleString()}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs">{dayjs(ts).format("MMM DD, YYYY · HH:mm:ss")}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Transactions</p>
                        <p className="font-mono font-medium text-sm">{b.transactions?.length ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Gas Used</p>
                        <p className="font-mono font-medium text-sm">{gasPct}%</p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Miner</p>
                      <p className="font-mono text-xs text-muted-foreground/80 truncate">{shorten(b.miner, 10, 8)}</p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Hash</p>
                      <p className="font-mono text-xs text-muted-foreground/60 truncate">{shorten(b.hash, 14, 10)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Outlet untuk child route tetap ada di sini */}
      <Outlet />
    </div>
  );
}
