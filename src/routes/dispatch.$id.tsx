import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getEntry, updateDispatch } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { label, fmtDate, fmtQty } from "@/lib/txn";

export const Route = createFileRoute("/dispatch/$id")({
  head: () => ({ meta: [{ title: "Dispatch Preview · Studio Ledger" }] }),
  loader: ({ params }) => gatedLoad(getEntry({ data: { id: params.id } })),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: DispatchPreview,
});

function DispatchPreview() {
  const { row } = Route.useLoaderData();
  const router = useRouter();
  const save = useServerFn(updateDispatch);

  const [dispatchNumber, setDispatchNumber] = useState(row.dispatch_number || "");
  const [photo, setPhoto] = useState(row.tick_item_photo || false);
  const [tracking, setTracking] = useState(row.tick_send_tracking || false);
  const [invoice, setInvoice] = useState(row.tick_send_invoice || false);
  
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({
        data: {
          id: row.id,
          dispatch_number: dispatchNumber,
          tick_item_photo: photo,
          tick_send_tracking: tracking,
          tick_send_invoice: invoice,
        },
      });
      setFlash("Dispatch details saved");
      router.invalidate();
      setTimeout(() => setFlash(null), 3000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell 
      title="Dispatch Preview" 
      subtitle={`Fulfillment checklist for ${row.ref}`}
      actions={
        <Link to="/ledger" search={{ start: undefined, end: undefined }} className="rounded-full border border-input px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary">
          Back to Ledger
        </Link>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="panel p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Transaction Details</h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-semibold">{fmtDate(row.occurred_on)}</dd>
            
            <dt className="text-muted-foreground">Item</dt>
            <dd className="font-semibold">{label(row)}</dd>

            <dt className="text-muted-foreground">Quantity</dt>
            <dd className="font-semibold">{fmtQty(row.qty)} {row.unit}</dd>

            {row.customer?.name ? (
              <>
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-semibold">{row.customer.name}</dd>
              </>
            ) : null}

            {row.channel?.name ? (
              <>
                <dt className="text-muted-foreground">Channel</dt>
                <dd className="font-semibold">{row.channel.name}</dd>
              </>
            ) : null}

            {row.invoice_item ? (
              <>
                <dt className="text-muted-foreground">Invoice Item</dt>
                <dd className="font-semibold">{row.invoice_item}</dd>
              </>
            ) : null}
            
            {row.order_number ? (
              <>
                <dt className="text-muted-foreground">Order No.</dt>
                <dd className="font-semibold">{row.order_number}</dd>
              </>
            ) : null}
            
            {row.order_date ? (
              <>
                <dt className="text-muted-foreground">Order Date</dt>
                <dd className="font-semibold">{fmtDate(row.order_date)}</dd>
              </>
            ) : null}
          </dl>
        </div>

        <form onSubmit={onSubmit} className="panel p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Dispatch Checklist</h3>
          
          <label className="block mb-5">
            <span className="label-plain mb-1.5 block">Dispatch / Tracking Number</span>
            <input
              value={dispatchNumber}
              onChange={(e) => setDispatchNumber(e.target.value)}
              placeholder="Enter docket or tracking number..."
              className="field focus:field-focus"
            />
          </label>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={photo}
                onChange={(e) => setPhoto(e.target.checked)}
                className="h-5 w-5 rounded border-input text-foreground focus:ring-foreground" 
              />
              <span className="text-sm font-medium">Item Photo Taken</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={tracking}
                onChange={(e) => setTracking(e.target.checked)}
                className="h-5 w-5 rounded border-input text-foreground focus:ring-foreground" 
              />
              <span className="text-sm font-medium">Tracking Sent</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={invoice}
                onChange={(e) => setInvoice(e.target.checked)}
                className="h-5 w-5 rounded border-input text-foreground focus:ring-foreground" 
              />
              <span className="text-sm font-medium">Invoice Sent</span>
            </label>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save Dispatch Details"}
            </button>
            {flash ? <span className="text-sm font-semibold text-received">{flash}</span> : null}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
