import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getDispatches, updateDispatch } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { label, fmtDate, fmtQty, type TxnRow } from "@/lib/txn";

export const Route = createFileRoute("/dispatches")({
  head: () => ({
    meta: [
      { title: "Dispatch Dashboard · Studio Ledger" },
      { name: "description", content: "Bulk manage fulfillment checklists." },
    ],
  }),
  loader: () => gatedLoad(getDispatches()),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: Dispatches,
});

function Dispatches() {
  const { rows } = Route.useLoaderData() as { rows: TxnRow[] };
  const router = useRouter();
  const save = useServerFn(updateDispatch);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filter rows: 'pending' means at least one checklist item is false or tracking number is empty
  const visible = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter(r => 
      !r.tick_item_photo || 
      !r.tick_send_tracking || 
      !r.tick_send_invoice || 
      !r.dispatch_number?.trim()
    );
  }, [rows, filter]);

  async function updateField(rowId: string, field: string, value: string | boolean) {
    setSavingId(rowId);
    try {
      const payload: any = { id: rowId };
      payload[field] = value;
      await save({ data: payload });
      router.invalidate();
    } catch (err) {
      alert("Failed to save. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AppShell
      title="Dispatch Dashboard"
      subtitle={`${visible.length} ${filter === 'pending' ? 'pending' : 'total'} items`}
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
          Pending Items
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
            filter === "all"
              ? "border-foreground bg-foreground text-background"
              : "border-input text-muted-foreground hover:bg-secondary"
          }`}
        >
          All Items
        </button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="label-plain px-4 py-3">Date & Ref</th>
              <th className="label-plain px-4 py-3">Item & Customer</th>
              <th className="label-plain px-4 py-3">Dispatch / Tracking No</th>
              <th className="label-plain px-4 py-3 text-center">Photo Taken</th>
              <th className="label-plain px-4 py-3 text-center">Tracking Sent</th>
              <th className="label-plain px-4 py-3 text-center">Invoice Sent</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No {filter} items found.
                </td>
              </tr>
            ) : visible.map((r) => (
              <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <div className="font-semibold">{fmtDate(r.occurred_on)}</div>
                  <div className="font-mono text-xs text-muted-foreground mt-0.5">{r.ref}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{label(r)} <span className="text-muted-foreground">× {fmtQty(r.qty)}</span></div>
                  {r.customer?.name || r.invoice_item ? (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[r.customer?.name, r.invoice_item].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    defaultValue={r.dispatch_number || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (r.dispatch_number || "")) {
                        updateField(r.id, "dispatch_number", e.target.value);
                      }
                    }}
                    placeholder="Tracking..."
                    className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:border-foreground focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={r.tick_item_photo || false}
                    onChange={(e) => updateField(r.id, "tick_item_photo", e.target.checked)}
                    disabled={savingId === r.id}
                    className="h-4 w-4 cursor-pointer rounded border-input"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={r.tick_send_tracking || false}
                    onChange={(e) => updateField(r.id, "tick_send_tracking", e.target.checked)}
                    disabled={savingId === r.id}
                    className="h-4 w-4 cursor-pointer rounded border-input"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={r.tick_send_invoice || false}
                    onChange={(e) => updateField(r.id, "tick_send_invoice", e.target.checked)}
                    disabled={savingId === r.id}
                    className="h-4 w-4 cursor-pointer rounded border-input"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
