import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { lockSite } from "@/lib/api.functions";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/entry", label: "Quick Entry" },
  { to: "/log", label: "Daily Log" },
  { to: "/ledger", label: "Ledger" },
  { to: "/reports", label: "Reports" },
  { to: "/search", label: "Search" },
  { to: "/masters", label: "Masters" },
  { to: "/audit", label: "Audit" },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const lock = useServerFn(lockSite);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo/logo.png" alt="Studio Nova" className="h-8 w-auto object-contain mix-blend-multiply" />
          </Link>
          <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-foreground !text-[var(--background)] shadow-md hover:bg-foreground hover:!text-[var(--background)]" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={async () => {
              await lock();
              router.navigate({ to: "/unlock" });
            }}
            className="ml-auto rounded-full border border-input px-5 py-2 text-xs font-bold text-foreground transition-all hover:bg-secondary hover:shadow-sm lg:ml-0"
          >
            Log out
          </button>
        </div>
        <nav className="flex gap-0.5 overflow-x-auto border-t border-border px-5 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-all"
              activeProps={{ className: "bg-foreground !text-[var(--background)] shadow-md hover:bg-foreground hover:!text-[var(--background)]" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        <div key={router.state.location.pathname} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
