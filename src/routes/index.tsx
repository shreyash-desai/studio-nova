import { gatedLoad } from "@/lib/gated";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getDashboard } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { Stat, TxnTable } from "@/components/ledger-ui";
import { TYPES, TYPE_LABEL, TYPE_SWATCH, fmtDayLong, fmtMoney, fmtQty, todayISO, type TxnRow } from "@/lib/txn";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · Studio Ledger" },
      {
        name: "description",
        content: "Today's stock movements, production and sales at a glance for the studio.",
      },
      { property: "og:title", content: "Overview · Studio Ledger" },
      { property: "og:description", content: "Today's stock movements, production and sales at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => {
    const today = todayISO();
    return gatedLoad(getDashboard({ data: { today, month: today.slice(0, 7) } }));
  },
  errorComponent: ({ error }) => <ErrorBox message={error.message} />,
  component: Overview,
});

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Couldn't load the overview</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function Overview() {
  const { rows, today } = Route.useLoaderData() as { rows: TxnRow[]; today: string };
  const todayRows = rows.filter((r) => r.occurred_on === today);

  const sum = (list: TxnRow[], type: string) =>
    list.filter((r) => r.type === type).reduce((a, r) => a + Number(r.qty), 0);
  const revenue = rows
    .filter((r) => r.type === "sold")
    .reduce((a, r) => a + Number(r.qty) * Number(r.unit_price ?? 0), 0);

  return (
    <AppShell
      title="Overview"
      subtitle={fmtDayLong(today)}
      actions={
        <Link
          to="/entry"
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          New entry
        </Link>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Entries today" value={todayRows.length} hint={`${rows.length} this month`} />
        <Stat label="Printed today" value={fmtQty(sum(todayRows, "printed"))} accent={TYPE_SWATCH["printed"]} hint="units off the printers" />
        <Stat label="Sold today" value={fmtQty(sum(todayRows, "sold"))} accent={TYPE_SWATCH["sold"]} hint="units dispatched" />
        <Stat label="Revenue this month" value={fmtMoney(revenue)} hint="from sold entries with a price" />
      </section>

      <section className="mt-8">
        <h2 className="label-rule">Month by type</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TYPES.map((t) => (
            <Stat
              key={t}
              label={TYPE_LABEL[t]!}
              value={fmtQty(sum(rows, t))}
              accent={TYPE_SWATCH[t]}
              hint={`${rows.filter((r) => r.type === t).length} entries`}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="label-rule">Today's entries</h2>
          <Link to="/log" className="text-xs font-semibold text-accent hover:underline">
            Open daily log →
          </Link>
        </div>
        <TxnTable rows={todayRows} showDate={false} />
      </section>
    </AppShell>
  );
}
