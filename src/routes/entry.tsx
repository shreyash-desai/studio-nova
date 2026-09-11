import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getMasters, createEntry } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { TYPES, TYPE_LABEL, TYPE_SWATCH, UNITS, REASONS, CONDITIONS, todayISO } from "@/lib/txn";

export const Route = createFileRoute("/entry")({
  head: () => ({
    meta: [
      { title: "Quick Entry · Studio Ledger" },
      {
        name: "description",
        content: "Log received stock, material usage, printed output, sales and returns in seconds.",
      },
      { property: "og:title", content: "Quick Entry · Studio Ledger" },
      { property: "og:description", content: "Log stock, production, sales and returns in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => gatedLoad(getMasters()),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: QuickEntry,
});

type Master = { id: string; name: string; unit?: string | null };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-plain">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function QuickEntry() {
  const masters = Route.useLoaderData();
  const router = useRouter();
  const submit = useServerFn(createEntry);

  const [type, setType] = useState<(typeof TYPES)[number]>("received");
  const [date, setDate] = useState(todayISO());
  const [addedBy, setAddedBy] = useState((masters as any).operatorId || "");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [unitTouched, setUnitTouched] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [reason, setReason] = useState(REASONS[0]!);
  const [condition, setCondition] = useState(CONDITIONS[0]!);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invoiceItem, setInvoiceItem] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [deliveryRefNo, setDeliveryRefNo] = useState("");
  const [orderDate, setOrderDate] = useState("");

  const isMaterial = type === "received" || type === "used";
  const items: Master[] = isMaterial ? (masters.materials as Master[]) : (masters.products as Master[]);
  const isB2B = (masters.channels as Master[]).find((c) => c.id === channelId)?.name?.toLowerCase() === "b2b";

  const defaultUnit = useMemo(() => {
    if (!isMaterial) return "pcs";
    const m = (masters.materials as Master[]).find((x) => x.id === itemId);
    return m?.unit ?? "";
  }, [isMaterial, itemId, masters.materials]);

  const effectiveUnit = unitTouched && unit ? unit : defaultUnit;

  function reset(keepType = true) {
    if (!keepType) setType("received");
    setItemId("");
    setQty("");
    setUnit("");
    setUnitTouched(false);
    setOrderNumber("");
    setNotes("");
    setInvoiceItem("");
    setDeliveredBy("");
    setDeliveryRefNo("");
    setOrderDate("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!itemId) return setError(isMaterial ? "Choose a material." : "Choose a product.");
    if (!qty || Number(qty) <= 0) return setError("Enter a quantity greater than zero.");
    setBusy(true);
    try {
      const res = await submit({
        data: {
          type,
          occurred_on: date,
          added_by: addedBy || null,
          product_id: isMaterial ? null : itemId,
          material_id: isMaterial ? itemId : null,
          qty: Number(qty),
          unit: effectiveUnit || "pcs",
          channel_id: type === "sold" || type === "return" ? channelId || null : null,
          customer_id: (type === "sold" || type === "return") && isB2B ? customerId || null : null,
          order_number: type === "sold" || type === "return" ? orderNumber || null : null,
          unit_price: null,
          reason: type === "used" ? reason : null,
          condition: type === "return" ? condition : null,
          notes: type === "sold" ? notes || null : null,
          invoice_item: type === "sold" ? invoiceItem || null : null,
          delivered_by: type === "sold" ? deliveredBy || null : null,
          delivery_ref_no: type === "sold" ? deliveryRefNo || null : null,
          order_date: type === "sold" ? orderDate || null : null,
        },
      });
      if (type === "sold") {
        router.navigate({ to: "/dispatch/$id", params: { id: res.id } });
      } else {
        setFlash(`Saved ${res.ref}`);
        reset();
        router.invalidate();
        setTimeout(() => setFlash(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Quick Entry" subtitle="Pick a movement type, fill three fields, save.">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TYPES.map((t) => {
          const active = t === type;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                reset();
              }}
              className={`panel flex items-center gap-2.5 px-4 py-3.5 text-left transition-colors ${
                active ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${TYPE_SWATCH[t]}`} />
              <span className="font-display text-base font-bold">{TYPE_LABEL[t]}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="panel mt-6 max-w-3xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field focus:field-focus"
            />
          </Field>
          
          <Field label="Added by">
            <select
              value={addedBy}
              onChange={(e) => setAddedBy(e.target.value)}
              className="field focus:field-focus disabled:opacity-70 disabled:bg-secondary disabled:cursor-not-allowed"
              disabled
            >
              <option value="">Select Operator…</option>
              {((masters as any).operators || []).map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={isMaterial ? "Material" : "Product"}>
            <select
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setUnitTouched(false);
              }}
              className="field focus:field-focus"
            >
              <option value="">Select…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Quantity">
            <input
              type="number"
              step="any"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              className="field focus:field-focus"
            />
          </Field>

          <Field label="Unit">
            <select
              value={effectiveUnit}
              onChange={(e) => {
                setUnit(e.target.value);
                setUnitTouched(true);
              }}
              className="field focus:field-focus"
            >
              <option value="">Select…</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {isMaterial && defaultUnit && !unitTouched ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Default unit for this material.
              </p>
            ) : null}
          </Field>

          {type === "used" ? (
            <Field label="Reason">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="field focus:field-focus"
              >
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          ) : null}

          {type === "return" ? (
            <Field label="Condition">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="field focus:field-focus"
              >
                {CONDITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          ) : null}

          {type === "sold" || type === "return" ? (
            <>
              <Field label="Channel">
                <select
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="field focus:field-focus"
                >
                  <option value="">Select…</option>
                  {(masters.channels as Master[]).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              {isB2B ? (
                <Field label="Customer">
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="field focus:field-focus"
                  >
                    <option value="">Select…</option>
                    {(masters.customers as Master[]).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Order number">
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Optional"
                  className="field focus:field-focus"
                />
              </Field>
            </>
          ) : null}

          {type === "sold" ? (
            <>
              <Field label="Invoice Item">
                <input
                  value={invoiceItem}
                  onChange={(e) => setInvoiceItem(e.target.value)}
                  placeholder="Optional"
                  className="field focus:field-focus"
                />
              </Field>
              <Field label="Delivered By">
                <input
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                  placeholder="Optional"
                  className="field focus:field-focus"
                />
              </Field>
              <Field label="Delivery Ref No">
                <input
                  value={deliveryRefNo}
                  onChange={(e) => setDeliveryRefNo(e.target.value)}
                  placeholder="Optional"
                  className="field focus:field-focus"
                />
              </Field>
              <Field label="Order Date">
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="field focus:field-focus"
                />
              </Field>
              <Field label="Notes">
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                  className="field focus:field-focus"
                />
              </Field>
            </>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-destructive">{error}</p> : null}
        {flash ? <p className="mt-4 text-sm font-semibold text-received">{flash}</p> : null}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background shadow transition-all hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : `Save ${TYPE_LABEL[type]!.toLowerCase()} entry`}
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full border border-input px-5 py-3 text-sm font-bold text-muted-foreground transition-all hover:bg-secondary"
          >
            Clear
          </button>
        </div>
      </form>
    </AppShell>
  );
}
