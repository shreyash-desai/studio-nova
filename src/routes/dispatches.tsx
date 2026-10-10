import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getDispatches, updateDispatch } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { fmtDate, fmtQty, label, type TxnRow } from "@/lib/txn";

export const Route = createFileRoute("/dispatches")({
  head: () => ({
    meta: [
      { title: "Dispatch Dashboard · Studio Ledger" },
      { name: "description", content: "Invoice-level fulfillment checklists." },
    ],
  }),
  loader: () => gatedLoad(getDispatches()),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: Dispatches,
});

/**
 * An invoice group: all sold transactions that share the same invoice_item.
 * Dispatch fields (dispatch_number, tick_*) are shared — we use the values
 * from the first row since updateDispatch synchronises them across all rows.
 */
type InvoiceGroup = {
  /** The invoice number — the grouping key. */
  invoice_item: string;
  /** Representative row (first in creation order) — carries shared dispatch state. */
  rep: TxnRow;
  /** All product rows for this invoice (including rep). */
  rows: TxnRow[];
};

function groupByInvoice(rows: TxnRow[]): InvoiceGroup[] {
  const map = new Map<string, TxnRow[]>();

  for (const row of rows) {
    // Exclude rows without a valid invoice number — they cannot be dispatched as an invoice.
    const key = row.invoice_item?.trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  // Build groups, sort by most-recent date then by invoice_item alphabetically.
  return [...map.entries()]
    .map(([invoice_item, groupRows]) => ({
      invoice_item,
      rep: groupRows[0]!,
      rows: groupRows,
    }))
    .sort((a, b) => {
      // Most recent occurrence_on first.
      const dateA = a.rep.occurred_on;
      const dateB = b.rep.occurred_on;
      if (dateB !== dateA) return dateB > dateA ? 1 : -1;
      return a.invoice_item.localeCompare(b.invoice_item);
    });
}

/** An invoice is dispatched-complete when it has a tracking number AND all ticks are set. */
function isComplete(group: InvoiceGroup): boolean {
  return (
    !!group.rep.dispatch_number?.trim() &&
    group.rep.tick_item_photo === true &&
    group.rep.tick_send_tracking === true &&
    group.rep.tick_send_invoice === true
  );
}

function Dispatches() {
  const { rows } = Route.useLoaderData() as { rows: TxnRow[] };
  const router = useRouter();
  const save = useServerFn(updateDispatch);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const groups = useMemo(() => groupByInvoice(rows), [rows]);

  const visible = useMemo(() => {
    if (filter === "all") return groups;
    return groups.filter((g) => !isComplete(g));
  }, [groups, filter]);

  async function updateField(invoice_item: string, field: string, value: string | boolean) {
    setSavingKey(invoice_item);
    try {
      const payload: Record<string, unknown> = { invoice_item };
      payload[field] = value;
      await save({ data: payload as Parameters<typeof save>[0]["data"] });
      router.invalidate();
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <AppShell
      title="Dispatch Dashboard"
      subtitle={`${visible.length} ${filter === "pending" ? "pending" : "total"} invoices`}
    >
      <div className="mb-5 flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
            filter === "pending"
              ? "border-foreground bg-foreground text-background"
              : "border-input text-muted-foreground hover:bg-secondary"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
            filter === "all"
              ? "border-foreground bg-foreground text-background"
              : "border-input text-muted-foreground hover:bg-secondary"
          }`}
        >
          All Invoices
        </button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="label-plain px-4 py-3">Invoice &amp; Date</th>
              <th className="label-plain px-4 py-3">Products</th>
              <th className="label-plain px-4 py-3">Customer</th>
              <th className="label-plain px-4 py-3">Dispatch / Tracking No</th>
              <th className="label-plain px-4 py-3 text-center">Photo</th>
              <th className="label-plain px-4 py-3 text-center">Tracking Sent</th>
              <th className="label-plain px-4 py-3 text-center">Invoice Sent</th>
              <th className="label-plain px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  {filter === "pending"
                    ? "All invoices are dispatched. Switch to All Invoices to see history."
                    : "No sold invoices found."}
                </td>
              </tr>
            ) : (
              visible.map((group) => {
                const saving = savingKey === group.invoice_item;
                const complete = isComplete(group);
                return (
                  <tr
                    key={group.invoice_item}
                    className={`border-b border-border/60 hover:bg-secondary/50 ${complete ? "opacity-60" : ""}`}
                  >
                    {/* Invoice number + date */}
                    <td className="px-4 py-3">
                      <div className="font-semibold font-mono text-xs">{group.invoice_item}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {fmtDate(group.rep.occurred_on)}
                      </div>
                      {group.rep.order_number ? (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          #{group.rep.order_number}
                        </div>
                      ) : null}
                    </td>

                    {/* All products in this invoice */}
                    <td className="px-4 py-3">
                      <ul className="space-y-0.5">
                        {group.rows.map((r) => (
                          <li key={r.id} className="text-xs">
                            <span className="font-medium">{label(r)}</span>
                            <span className="text-muted-foreground"> × {fmtQty(r.qty)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {group.rep.customer?.name ?? <span className="text-muted-foreground">—</span>}
                      </div>
                      {group.rep.channel?.name ? (
                        <div className="text-xs text-muted-foreground">{group.rep.channel.name}</div>
                      ) : null}
                    </td>

                    {/* Dispatch/tracking number — editable inline */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={group.rep.dispatch_number || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (group.rep.dispatch_number || "")) {
                            updateField(group.invoice_item, "dispatch_number", e.target.value);
                          }
                        }}
                        placeholder="Tracking…"
                        className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:border-foreground focus:outline-none"
                        disabled={saving}
                      />
                    </td>

                    {/* Photo taken checkbox */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={group.rep.tick_item_photo || false}
                        onChange={(e) =>
                          updateField(group.invoice_item, "tick_item_photo", e.target.checked)
                        }
                        disabled={saving}
                        className="h-4 w-4 cursor-pointer rounded border-input"
                      />
                    </td>

                    {/* Tracking sent checkbox */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={group.rep.tick_send_tracking || false}
                        onChange={(e) =>
                          updateField(group.invoice_item, "tick_send_tracking", e.target.checked)
                        }
                        disabled={saving}
                        className="h-4 w-4 cursor-pointer rounded border-input"
                      />
                    </td>

                    {/* Invoice sent checkbox */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={group.rep.tick_send_invoice || false}
                        onChange={(e) =>
                          updateField(group.invoice_item, "tick_send_invoice", e.target.checked)
                        }
                        disabled={saving}
                        className="h-4 w-4 cursor-pointer rounded border-input"
                      />
                    </td>

                    {/* Link to full invoice-level detail page */}
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/dispatch/$invoiceItem"
                        params={{ invoiceItem: encodeURIComponent(group.invoice_item) }}
                        className="rounded-full border border-input px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-foreground hover:text-background hover:border-foreground transition-all whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Show a note about any sold transactions with no invoice number */}
      {(() => {
        const noInvoice = rows.filter((r) => !r.invoice_item?.trim());
        if (noInvoice.length === 0) return null;
        return (
          <p className="mt-4 text-xs text-muted-foreground">
            {noInvoice.length} sold transaction{noInvoice.length !== 1 ? "s" : ""} have no invoice
            number and are excluded from this view. Add invoice numbers via the ledger.
          </p>
        );
      })()}
    </AppShell>
  );
}
