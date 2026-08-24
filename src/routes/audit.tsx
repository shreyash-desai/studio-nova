import { gatedLoad } from "@/lib/gated";
import { createFileRoute } from "@tanstack/react-router";
import { getAuditLog } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ledger-ui";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail · Studio Ledger" },
      {
        name: "description",
        content: "Every create, edit, reversal and deletion recorded with a timestamp.",
      },
      { property: "og:title", content: "Audit Trail · Studio Ledger" },
      { property: "og:description", content: "Every create, edit, reversal and deletion, timestamped." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => gatedLoad(getAuditLog()),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: Audit,
});

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: unknown;
  created_at: string;
};

const ACTION_COLOR: Record<string, string> = {
  create: "bg-received",
  update: "bg-printed",
  reverse: "bg-return",
  delete: "bg-destructive",
};

function Audit() {
  const { rows } = Route.useLoaderData() as { rows: AuditRow[] };

  return (
    <AppShell title="Audit Trail" subtitle="Last 300 changes, newest first.">
      {rows.length === 0 ? (
        <EmptyState>Nothing recorded yet.</EmptyState>
      ) : (
        <ol className="panel divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${ACTION_COLOR[r.action] ?? "bg-muted"}`} />
              <span className="font-semibold capitalize">{r.action}</span>
              <span className="text-muted-foreground">{r.entity.replace("_", " ")}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {typeof r.detail === "object" && r.detail
                  ? JSON.stringify(r.detail).slice(0, 120)
                  : ""}
              </span>
              <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString("en-GB")}
              </span>
            </li>
          ))}
        </ol>
      )}
    </AppShell>
  );
}
