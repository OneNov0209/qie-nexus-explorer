import { FOOTER_LINKS, NETWORK } from "@/data/network";
import { Mail } from "lucide-react";

export function Footer() {
  const products = FOOTER_LINKS?.products || [];
  const ecosystem = (FOOTER_LINKS as any)?.ecosystem || [];
  const developers = FOOTER_LINKS?.developers || [];
  const community = FOOTER_LINKS?.community || [];
  const company = (FOOTER_LINKS as any)?.company || [];

  return (
    <footer className="mt-16 border-t border-border/60 bg-background/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        <div className="col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-center gap-3">
            <img src={NETWORK.logo} className="w-10 h-10 rounded-full ring-1 ring-primary/40" alt="" />
            <div>
              <div className="font-semibold gradient-text text-lg">QIE Explorer</div>
              <div className="text-xs text-muted-foreground">Mainnet · Chain {NETWORK.chainId}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Hybrid Cosmos + EVM block explorer for the QIE ecosystem.
          </p>
          <a href={`mailto:${FOOTER_LINKS.email || ""}`} className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary">
            <Mail className="w-3.5 h-3.5" /> {FOOTER_LINKS.email || ""}
          </a>
        </div>
        {products.length > 0 && <FCol title="Products" items={products} />}
        {ecosystem.length > 0 && <FCol title="Ecosystem" items={ecosystem} />}
        {developers.length > 0 && <FCol title="Developers" items={developers} />}
        {community.length > 0 && <FCol title="Community" items={community} />}
        {company.length > 0 && <FCol title="Company" items={company} />}
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} QIE Blockchain. All rights reserved.
      </div>
    </footer>
  );
}

function FCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <a href={i.href} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary transition">
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
