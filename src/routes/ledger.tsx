import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getLedger, reverseEntry } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { TxnTable } from "@/components/ledger-ui";
import { TYPES, TYPE_LABEL, todayISO, type TxnRow } from "@/lib/txn";

function monthStart() {
  return todayISO().slice(0, 7) + "-01";
}

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "Ledger · Studio Ledger" },
      {
        name: "description",
        content: "Filterable ledger of every movement with reversals and full history.",
      },
      { property: "og:title", content: "Ledger · Studio Ledger" },
      { property: "og:description", content: "Filterable ledger of every studio movement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    start: typeof s["start"] === "string" ? s["start"] : undefined,
    end: typeof s["end"] === "string" ? s["end"] : undefined,
  }),
  loaderDeps: ({ search }) => ({
    start: search.start ?? monthStart(),
    end: search.end ?? todayISO(),
  }),
  loader: ({ deps }) => getLedger({ data: deps }),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: Ledger;
});

function Ledger() {
  const { rows } = Route.useLoaderData() as { rows: TxnRow[] };
  const search = Route.useSearch();
  const router = useRouter();
  const reverse = useServerFn(reverseEntry);
  const [filter, setFilter] = useState<string>("all");
  const start = search.start ?? monthStart();
  const end = search.end ?? todayISO();

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.type === filter)),
    [rows, filter],
  );

  async function onReverse(row: TxnRow) {
    await reverse({ data: { id: row.id } });
    router.invalidate();
  }

  function setRange(patch: { start?: string; end?: string }) {
    router.navigate({ to: "/ledger", search: { start, end, ...patch } });
  }

  return (
    <AppShell
      title="Ledger"
      subtitle={`${visible.length} entries between ${start} and ${end}`}
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
      <div className="mb-4 flex flex-wrap gap-1.5">
        {["all", ...TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === t
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t === "all" ? "All" : TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <TxnTable rows={visible} onReverse={onReverse} />
    </AppShell>
  );
}
