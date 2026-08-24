import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { getLedger } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { Stat, EmptyState } from "@/components/ledger-ui";
import { TYPES, TYPE_LABEL, TYPE_SWATCH, fmtMoney, fmtQty, label, todayISO, type TxnRow } from "@/lib/txn";

function monthStart() {
  return todayISO().slice(0, 7) + "-01";
}

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Studio Ledger" },
      {
        name: "description",
        content: "Totals by movement type, top products, channels and revenue for any date range.",
      },
      { property: "og:title", content: "Reports · Studio Ledger" },
      { property: "og:description", content: "Totals, top products and revenue for any date range." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    start: typeof s["start"] === "string" ? s["start"] : undefined,
    end: typeof s["end"] === "string" ? s["end"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ start: search.start ?? monthStart(), end: search.end ?? todayISO() }),
  loader: ({ deps }) => gatedLoad(getLedger({ data: deps })),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: Reports,
});

function rank(rows: TxnRow[], key: (r: TxnRow) => string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (!k || k === "—") continue;
    map.set(k, (map.get(k) ?? 0) + Number(r.qty));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function RankList({ title, items, unit }: { title: string; items: [string, number][]; unit?: string }) {
  const max = items[0]?.[1] || 1;
  return (
    <div className="panel p-5">
      <h3 className="label-rule">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing in this range.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map(([name, qty]) => (
            <li key={name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmtQty(qty)} {unit ?? ""}
                </span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-secondary">
                <div
                  className="h-1 rounded-full bg-accent"
                  style={{ width: `${Math.max(4, (qty / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Reports() {
  const { rows } = Route.useLoaderData() as { rows: TxnRow[] };
  const search = Route.useSearch();
  const router = useRouter();
  const start = search.start ?? monthStart();
  const end = search.end ?? todayISO();

  const revenue = useMemo(
    () =>
      rows
        .filter((r) => r.type === "sold")
        .reduce((a, r) => a + Number(r.qty) * Number(r.unit_price ?? 0), 0),
    [rows],
  );

  const sold = rows.filter((r) => r.type === "sold");
  const printed = rows.filter((r) => r.type === "printed");
  const used = rows.filter((r) => r.type === "used");

  function setRange(patch: { start?: string; end?: string }) {
    router.navigate({ to: "/reports", search: { start, end, ...patch } });
  }

  return (
    <AppShell
      title="Reports"
      subtitle={`${rows.length} entries between ${start} and ${end}`}
      actions={
        <>
          <input
            type="date"
            value={start}
            onChange={(e) => setRange({ start: e.target.value })}
            className="field w-auto focus:field-focus"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setRange({ end: e.target.value })}
            className="field w-auto focus:field-focus"
          />
        </>
      }
    >
      {rows.length === 0 ? (
        <EmptyState>No entries in this range.</EmptyState>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {TYPES.map((t) => (
              <Stat
                key={t}
                label={TYPE_LABEL[t]!}
                value={fmtQty(rows.filter((r) => r.type === t).reduce((a, r) => a + Number(r.qty), 0))}
                accent={TYPE_SWATCH[t]}
              />
            ))}
            <Stat label="Revenue" value={fmtMoney(revenue)} />
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            <RankList title="Top products sold" items={rank(sold, (r) => label(r))} />
            <RankList title="Most printed" items={rank(printed, (r) => label(r))} />
            <RankList title="Materials consumed" items={rank(used, (r) => label(r))} />
            <RankList title="Sales by channel" items={rank(sold, (r) => r.channel?.name ?? "")} />
            <RankList title="Sales by customer" items={rank(sold, (r) => r.customer?.name ?? "")} />
            <RankList
              title="Returns by reason"
              items={rank(
                rows.filter((r) => r.type === "return"),
                (r) => r.condition ?? "",
              )}
            />
          </section>
        </>
      )}
    </AppShell>
  );
}
