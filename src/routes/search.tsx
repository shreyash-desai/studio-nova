import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { searchLedger } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { TxnTable, EmptyState } from "@/components/ledger-ui";
import type { TxnRow } from "@/lib/txn";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search · Studio Ledger" },
      {
        name: "description",
        content: "Find any entry by reference, order number or note across the whole ledger.",
      },
      { property: "og:title", content: "Search · Studio Ledger" },
      { property: "og:description", content: "Find any entry by reference, order number or note." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ q: search.q ?? "" }),
  loader: ({ deps }) => gatedLoad(searchLedger({ data: { q: deps.q } })),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: SearchPage,
});

function SearchPage() {
  const { rows } = Route.useLoaderData() as { rows: TxnRow[] };
  const { q } = Route.useSearch();
  const router = useRouter();

  return (
    <AppShell title="Search" subtitle="Reference numbers, order numbers and notes.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get("q") ?? "");
          router.navigate({ to: "/search", search: { q: value } });
        }}
        className="mb-6 flex max-w-xl gap-2"
      >
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="TXN-2026-00012, order #, note…"
          className="field focus:field-focus"
        />
        <button className="shrink-0 rounded bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">
          Search
        </button>
      </form>

      {!q ? (
        <EmptyState>Type something to search the ledger.</EmptyState>
      ) : (
        <TxnTable rows={rows} />
      )}
    </AppShell>
  );
}
