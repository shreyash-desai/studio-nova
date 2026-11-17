import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { getDayLog, reverseEntry } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { TxnTable } from "@/components/ledger-ui";
import { fmtDayLong, todayISO, type TxnRow } from "@/lib/txn";
import { Truck, Package, Layers } from "lucide-react";

type Search = { date?: string | undefined };

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Daily Log · Studio Nova" },
      {
        name: "description",
        content: "Day-by-day record of stock, production, sales, returns and daily dispatches.",
      },
      { property: "og:title", content: "Daily Log · Studio Nova" },
      { property: "og:description", content: "Day-by-day record of every studio entry and dispatch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    date: typeof search["date"] === "string" ? search["date"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ date: search.date ?? todayISO() }),
  loader: ({ deps }) =>
    gatedLoad(getDayLog({ data: { date: deps.date, month: deps.date.slice(0, 7) } })),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{(error as any)?.message || String(error)}</div>
  ),
  component: DailyLog,
});

function DailyLog() {
  const { days, entries } = Route.useLoaderData() as {
    days: { date: string; lines: number }[];
    entries: TxnRow[];
  };
  const search = Route.useSearch();
  const date = search.date ?? todayISO();
  const router = useRouter();
  const reverse = useServerFn(reverseEntry);
  const [busy, setBusy] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "dispatches" | "printed" | "materials">("all");

  const dispatches = useMemo(() => entries.filter((r) => r.type === "sold"), [entries]);
  const production = useMemo(() => entries.filter((r) => r.type === "printed"), [entries]);
  const materials = useMemo(() => entries.filter((r) => r.type === "received" || r.type === "used"), [entries]);

  const filteredEntries = useMemo(() => {
    if (typeFilter === "dispatches") return dispatches;
    if (typeFilter === "printed") return production;
    if (typeFilter === "materials") return materials;
    return entries;
  }, [entries, typeFilter, dispatches, production, materials]);

  async function onReverse(row: TxnRow) {
    if (busy) return;
    setBusy(true);
    await reverse({ data: { id: row.id } });
    await router.invalidate();
    setBusy(false);
  }

  return (
    <AppShell
      title="Daily Log"
      subtitle={fmtDayLong(date)}
      actions={
        <div className="flex items-center gap-3">
          <Link
            to="/dispatches"
            className="rounded-full border border-input px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Dispatch Board →</span>
          </Link>
          <input
            type="date"
            value={date}
            onChange={(e) => router.navigate({ to: "/log", search: { date: e.target.value } })}
            className="field w-auto focus:field-focus text-sm font-semibold"
          />
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <h2 className="label-rule">Days with activity</h2>
          <div className="mt-3 space-y-1">
            {days.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing logged this month yet.</p>
            ) : (
              days.map((d) => (
                <button
                  key={d.date}
                  onClick={() => router.navigate({ to: "/log", search: { date: d.date } })}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors ${d.date === date
                      ? "bg-foreground text-background font-semibold"
                      : "hover:bg-secondary text-muted-foreground"
                    }`}
                >
                  <span>{d.date.slice(8)}/{d.date.slice(5, 7)}</span>
                  <span className="text-xs tabular-nums opacity-70">{d.lines}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div>
          {/* Quick Filter Tabs for the Day */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${typeFilter === "all"
                    ? "bg-foreground text-background"
                    : "border border-input text-muted-foreground hover:bg-secondary"
                  }`}
              >
                All Entries ({entries.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("dispatches")}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold transition-all ${typeFilter === "dispatches"
                    ? "bg-foreground text-background"
                    : "border border-input text-muted-foreground hover:bg-secondary"
                  }`}
              >
                <Truck className="w-3 h-3" />
                <span>Dispatches ({dispatches.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("printed")}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold transition-all ${typeFilter === "printed"
                    ? "bg-foreground text-background"
                    : "border border-input text-muted-foreground hover:bg-secondary"
                  }`}
              >
                <Package className="w-3 h-3" />
                <span>Production ({production.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("materials")}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold transition-all ${typeFilter === "materials"
                    ? "bg-foreground text-background"
                    : "border border-input text-muted-foreground hover:bg-secondary"
                  }`}
              >
                <Layers className="w-3 h-3" />
                <span>Materials ({materials.length})</span>
              </button>
            </div>
          </div>

          <div className="mt-3">
            <TxnTable rows={filteredEntries} showDate={false} onReverse={onReverse} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
