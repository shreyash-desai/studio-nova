import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getInvoiceDispatch, updateDispatch } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { label, fmtDate, fmtQty, parseDispatchMeta, type TxnRow } from "@/lib/txn";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/dispatch/$invoiceItem")({
  head: () => ({ meta: [{ title: "Dispatch Detail · Studio Nova" }] }),
  loader: ({ params }) =>
    gatedLoad(
      getInvoiceDispatch({ data: { invoice_item: decodeURIComponent(params.invoiceItem) } }),
    ),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{(error as any)?.message || String(error)}</div>
  ),
  component: DispatchDetail,
});

function DispatchDetail() {
  const { rows } = Route.useLoaderData() as { rows: TxnRow[] };
  const router = useRouter();
  const save = useServerFn(updateDispatch);

  // All rows share the same invoice-level dispatch fields — use the first row.
  const rep = rows[0]!;
  const invoiceItem = rep.invoice_item!;
  const initialMeta = parseDispatchMeta(rep);

  const [dispatchNumber, setDispatchNumber] = useState(rep.dispatch_number || "");
  const [photo, setPhoto] = useState(rep.tick_item_photo || !!initialMeta.photo_url || false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialMeta.photo_url || null);
  const [sent, setSent] = useState(initialMeta.tick_sent || false);
  const [isReturn, setIsReturn] = useState(initialMeta.tick_return || false);
  const [tracking, setTracking] = useState(rep.tick_send_tracking || false);
  const [invoiceSent, setInvoiceSent] = useState(rep.tick_send_invoice || false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({
        data: {
          invoice_item: invoiceItem,
          dispatch_number: dispatchNumber,
          tick_item_photo: photo || !!photoUrl,
          photo_url: photoUrl,
          tick_sent: sent,
          tick_return: isReturn,
          tick_send_tracking: tracking,
          tick_send_invoice: invoiceSent,
        },
      });
      setFlash("Dispatch details saved for all items in this invoice");
      router.invalidate();
      setTimeout(() => setFlash(null), 4000);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Dispatch Detail"
      subtitle={`Invoice ${invoiceItem}`}
      actions={
        <Link
          to="/dispatches"
          className="rounded-full border border-input px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
        >
          ← Back to Dispatches
        </Link>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Invoice & product details */}
        <div className="panel p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Invoice Details</h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Invoice No.</dt>
            <dd className="font-semibold font-mono">{invoiceItem}</dd>

            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-semibold">{fmtDate(rep.occurred_on)}</dd>

            {rep.customer?.name ? (
              <>
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-semibold">{rep.customer.name}</dd>
              </>
            ) : null}

            {rep.channel?.name ? (
              <>
                <dt className="text-muted-foreground">Channel</dt>
                <dd className="font-semibold">{rep.channel.name}</dd>
              </>
            ) : null}

            {rep.order_number ? (
              <>
                <dt className="text-muted-foreground">Order No.</dt>
                <dd className="font-semibold">{rep.order_number}</dd>
              </>
            ) : null}

            {rep.delivered_by ? (
              <>
                <dt className="text-muted-foreground">Delivered By</dt>
                <dd className="font-semibold">{rep.delivered_by}</dd>
              </>
            ) : null}

            {rep.delivery_ref_no ? (
              <>
                <dt className="text-muted-foreground">Delivery Ref</dt>
                <dd className="font-semibold">{rep.delivery_ref_no}</dd>
              </>
            ) : null}
          </dl>

          {/* Product line items */}
          <h4 className="mt-6 mb-3 text-sm font-bold text-foreground/80 uppercase tracking-tight">
            Items ({rows.length})
          </h4>
          <ul className="divide-y divide-border/60">
            {rows.map((r: TxnRow) => (
              <li
                key={r.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium">{label(r)}</span>
                  {r.product?.sku ? (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {r.product.sku}
                    </span>
                  ) : null}
                </div>
                <div className="text-right tabular-nums font-semibold">
                  {fmtQty(r.qty)}
                  {r.unit ? <span className="ml-1 text-muted-foreground font-normal">{r.unit}</span> : null}
                </div>
              </li>
            ))}
          </ul>

          {/* Total quantity across all products */}
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-bold">
            <span>Total units</span>
            <span className="tabular-nums">
              {fmtQty(rows.reduce((sum, r) => sum + Number(r.qty), 0))}
            </span>
          </div>
        </div>

        {/* Right: dispatch checklist form */}
        <form onSubmit={onSubmit} className="panel p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Dispatch Checklist</h3>
          <p className="mb-5 text-xs text-muted-foreground">
            These settings apply to all {rows.length} item{rows.length !== 1 ? "s" : ""} in this invoice.
            Saving once synchronises the entire invoice.
          </p>

          <label className="block mb-5">
            <span className="label-plain mb-1.5 block">Dispatch / Tracking Number</span>
            <input
              value={dispatchNumber}
              onChange={(e) => setDispatchNumber(e.target.value)}
              placeholder="Enter docket, AWB, or tracking number…"
              className="field focus:field-focus"
            />
          </label>

          {/* Photo Button (Placeholder, does not work per request) */}
          <div className="mb-6 rounded-xl border border-border p-4 bg-secondary/30 flex items-center justify-between">
            <div>
              <span className="label-plain block">Checkout Parcel Photo</span>
              <p className="text-xs text-muted-foreground mt-0.5">Photo verification</p>
            </div>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-input text-muted-foreground bg-secondary/50 cursor-not-allowed opacity-75"
              title="Photo placeholder"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Photo</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Sent Ka Tick */}
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
              <input
                type="checkbox"
                checked={sent}
                onChange={(e) => setSent(e.target.checked)}
                className="h-5 w-5 rounded border-input accent-green-600 focus:ring-green-600"
              />
              <div>
                <span className="text-sm font-bold text-foreground">Sent / Dispatched ✓</span>
                <p className="text-xs text-muted-foreground">Order has been packed and handed over to courier / transport</p>
              </div>
            </label>

            {/* Return Ka Tick */}
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
              <input
                type="checkbox"
                checked={isReturn}
                onChange={(e) => setIsReturn(e.target.checked)}
                className="h-5 w-5 rounded border-input accent-red-600 focus:ring-red-600"
              />
              <div>
                <span className="text-sm font-bold text-destructive">Return ✗</span>
                <p className="text-xs text-muted-foreground">Flag this order as returned by customer or logistics</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
              <input
                type="checkbox"
                checked={tracking}
                onChange={(e) => setTracking(e.target.checked)}
                className="h-5 w-5 rounded border-input text-foreground focus:ring-foreground"
              />
              <span className="text-sm font-medium">Tracking Link Sent</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
              <input
                type="checkbox"
                checked={invoiceSent}
                onChange={(e) => setInvoiceSent(e.target.checked)}
                className="h-5 w-5 rounded border-input text-foreground focus:ring-foreground"
              />
              <span className="text-sm font-medium">Invoice Document Sent</span>
            </label>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background hover:opacity-90 disabled:opacity-50 shadow-sm transition-all"
            >
              {busy ? "Saving…" : "Save Dispatch Details"}
            </button>
            {flash ? (
              <span
                className={`text-sm font-semibold ${flash.startsWith("Could") ? "text-destructive" : "text-green-600"}`}
              >
                {flash}
              </span>
            ) : null}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
