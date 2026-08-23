import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getDayLog, reverseEntry } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { TxnTable } from "@/components/ledger-ui";
import { fmtDayLong, todayISO, type TxnRow } from "@/lib/txn";

type Search = { date?: string };

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Daily Log · Studio Ledger" },
      {
        name: "description",
        content: "Day-by-day record of every stock, production, sales and return entry.",
      },
      { property: "og:title", content: "Daily Log · Studio Ledger" },
      { property: "og:description", content: "Day-by-day record of every studio entry." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    date: typeof search["date"] === "string" ? search["date"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ date: search.date ?? todayISO() }),
  loader: ({ deps }) => getDayLog({ data: { date: deps.date, month: deps.date.slice(0, 7) } }),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
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
        <input
          type="date"
          value={date}
          onChange={(e) => router.navigate({ to: "/log", search: { date: e.target.value } })}
          className="field w-auto focus:field-focus"
        />
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
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
                    d.date === date
                      ? "bg-foreground text-background"
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
          <h2 className="label-rule">{entries.length} entries</h2>
          <div className="mt-3">
            <TxnTable rows={entries} showDate={false} onReverse={onReverse} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
