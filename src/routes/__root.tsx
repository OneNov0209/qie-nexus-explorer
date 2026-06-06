import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts, useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Footer } from "@/components/layout/Footer";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-2xl p-10 text-center max-w-md">
        <div className="text-6xl font-bold gradient-text">404</div>
        <h2 className="mt-3 text-lg font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <a href="/" className="btn-primary inline-flex mt-6 rounded-xl px-4 py-2 text-sm">Back to Dashboard</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 text-center max-w-md">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground break-all">{error.message}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-primary rounded-xl px-4 py-2 text-sm">Try again</button>
          <a href="/" className="glass rounded-xl px-4 py-2 text-sm hover:bg-white/10">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "QIE Explorer — Hybrid Cosmos + EVM Block Explorer" },
      { name: "description", content: "Premium block explorer for the QIE Mainnet — blocks, transactions, validators, governance, IBC and more." },
      { name: "theme-color", content: "#0A0A0A" },
      { property: "og:title", content: "QIE Explorer" },
      { property: "og:description", content: "Hybrid Cosmos + EVM block explorer for the QIE Mainnet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    try {
      const raw = localStorage.getItem("qie-theme");
      const theme = raw ? JSON.parse(raw)?.state?.theme : "dark";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(theme === "light" ? "light" : "dark");
    } catch { document.documentElement.classList.add("dark"); }
  }, []);

  if (isHomePage) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen">
          <Outlet />
        </div>
        <Toaster theme="dark" />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 px-6 py-6">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
      <Toaster theme="dark" />
    </QueryClientProvider>
  );
}
