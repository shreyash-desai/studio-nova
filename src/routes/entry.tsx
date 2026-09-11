import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getMasters, createEntries } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { TYPES, TYPE_LABEL, TYPE_SWATCH, UNITS, CONDITIONS, todayISO } from "@/lib/txn";

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

type EntryItem = { _key: string; itemId: string; qty: string; unit: string; unitTouched: boolean };

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
  const submit = useServerFn(createEntries);

  const [type, setType] = useState<(typeof TYPES)[number]>("received");
  const [date, setDate] = useState(todayISO());
  const [addedBy, setAddedBy] = useState((masters as any).operatorId || "");
  
  // Global Fields
  const [channelId, setChannelId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [condition, setCondition] = useState(CONDITIONS[0]!);
  const [notes, setNotes] = useState("");
  
  const [invoiceItem, setInvoiceItem] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [deliveryRefNo, setDeliveryRefNo] = useState("");

  // Items
  const [items, setItems] = useState<EntryItem[]>([{ _key: Math.random().toString(), itemId: "", qty: "", unit: "", unitTouched: false }]);

  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMaterial = type === "received" || type === "used";
  const masterItems: Master[] = isMaterial ? (masters.materials as Master[]) : (masters.products as Master[]);
  const isB2B = (masters.channels as Master[]).find((c) => c.id === channelId)?.name?.toLowerCase() === "b2b";
  const isSold = type === "sold";
  const isReturn = type === "return";

  function getDefaultUnit(itemId: string) {
    if (!isMaterial) return "pcs";
    const m = (masters.materials as Master[]).find((x) => x.id === itemId);
    return m?.unit ?? "";
  }

  function reset(keepType = true) {
    if (!keepType) setType("received");
    setItems([{ _key: Math.random().toString(), itemId: "", qty: "", unit: "", unitTouched: false }]);
    setOrderNumber("");
    setNotes("");
    setInvoiceItem("");
    setDeliveredBy("");
    setDeliveryRefNo("");
    setChannelId("");
    setCustomerId("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (isSold) {
      if (!invoiceItem.trim()) return setError("Invoice Number is required for sold entries.");
      if (!deliveredBy.trim()) return setError("Delivered By is required for sold entries.");
      if (!deliveryRefNo.trim()) return setError("Delivery Ref No is required for sold entries.");
    }

    const validItems = items.filter(i => i.itemId && i.qty && Number(i.qty) > 0);
    if (validItems.length === 0) return setError("Please add at least one valid item with a quantity greater than zero.");

    setBusy(true);
    try {
      const payload = validItems.map(item => {
        const effectiveUnit = item.unitTouched && item.unit ? item.unit : getDefaultUnit(item.itemId);
        return {
          type,
          occurred_on: date,
          added_by: addedBy || null,
          product_id: isMaterial ? null : item.itemId,
          material_id: isMaterial ? item.itemId : null,
          qty: Number(item.qty),
          unit: effectiveUnit || "pcs",
          channel_id: isSold || isReturn ? channelId || null : null,
          customer_id: (isSold || isReturn) && isB2B ? customerId || null : null,
          order_number: isSold || isReturn ? orderNumber || null : null,
          unit_price: null,
          condition: isReturn ? condition : null,
          notes: isSold ? notes || null : null,
          invoice_item: isSold ? invoiceItem || null : null,
          delivered_by: isSold ? deliveredBy || null : null,
          delivery_ref_no: isSold ? deliveryRefNo || null : null,
        };
      });

      const res = await submit({ data: payload });
      
      setFlash(`Saved ${res.length} entries`);
      reset();
      router.invalidate();
      setTimeout(() => setFlash(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Quick Entry" subtitle="Pick a movement type, fill fields, and save.">
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
                active ? "border-foreground bg-foreground text-background" : "hover:bg-foreground hover:!text-[var(--background)]"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${TYPE_SWATCH[t]}`} />
              <span className="font-display text-base font-bold">{TYPE_LABEL[t]}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="mt-6 max-w-4xl space-y-6">
        
        {/* Global Details Panel */}
        <div className="panel p-5">
          <h2 className="mb-4 text-sm font-bold tracking-tight text-foreground/80 uppercase">Global Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field focus:field-focus" />
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
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>

            {isSold || isReturn ? (
              <>
                <Field label="Channel">
                  <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="field focus:field-focus">
                    <option value="">Select…</option>
                    {(masters.channels as Master[]).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                {isB2B ? (
                  <Field label="Customer">
                    <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="field focus:field-focus">
                      <option value="">Select…</option>
                      {(masters.customers as Master[]).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                <Field label="Order number">
                  <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Optional" className="field focus:field-focus" />
                </Field>
              </>
            ) : null}

            {isSold ? (
              <>
                <Field label="Invoice Number *">
                  <input value={invoiceItem} onChange={(e) => setInvoiceItem(e.target.value)} placeholder="Required" required className="field focus:field-focus" />
                </Field>
                <Field label="Delivery Ref No *">
                  <input value={deliveryRefNo} onChange={(e) => setDeliveryRefNo(e.target.value)} placeholder="Required" required className="field focus:field-focus" />
                </Field>
                <Field label="Delivered By *">
                  <input value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)} placeholder="Required" required className="field focus:field-focus" />
                </Field>
                <Field label="Notes">
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="field focus:field-focus" />
                </Field>
              </>
            ) : null}


            {isReturn ? (
              <Field label="Condition">
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="field focus:field-focus">
                  {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            ) : null}
          </div>
        </div>

        {/* Items Panel */}
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-foreground/80 uppercase">Items</h2>
            <button
              type="button"
              onClick={() => setItems([...items, { _key: Math.random().toString(), itemId: "", qty: "", unit: "", unitTouched: false }])}
              className="text-xs font-bold text-accent hover:underline"
            >
              + Add Item
            </button>
          </div>
          
          <div className="space-y-4">
            {items.map((item, index) => {
              const defUnit = getDefaultUnit(item.itemId);
              const effUnit = item.unitTouched && item.unit ? item.unit : defUnit;

              return (
                <div key={item._key} className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4 relative group">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems(items.filter(i => i._key !== item._key))}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                    >
                      ×
                    </button>
                  )}
                  <div className="flex-1 min-w-[200px]">
                    <Field label={isMaterial ? "Material" : "Product"}>
                      <select
                        value={item.itemId}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index]!.itemId = e.target.value;
                          newItems[index]!.unitTouched = false;
                          setItems(newItems);
                        }}
                        className="field focus:field-focus"
                      >
                        <option value="">Select…</option>
                        {masterItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="w-24">
                    <Field label="Quantity">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.qty}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index]!.qty = e.target.value;
                          setItems(newItems);
                        }}
                        placeholder="0"
                        className="field focus:field-focus"
                      />
                    </Field>
                  </div>
                  <div className="w-28">
                    <Field label="Unit">
                      <select
                        value={effUnit}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index]!.unit = e.target.value;
                          newItems[index]!.unitTouched = true;
                          setItems(newItems);
                        }}
                        className="field focus:field-focus"
                      >
                        <option value="">Select…</option>
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error ? <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</div> : null}
        
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-foreground px-8 py-3 text-sm font-bold text-background shadow transition-all hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving..." : `Save ${type} entry`}
          </button>
          <button
            type="button"
            onClick={() => reset(true)}
            className="rounded-full border border-input bg-background px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            Clear
          </button>
          {flash ? <span className="text-sm font-semibold text-accent animate-in fade-in">{flash}</span> : null}
        </div>
      </form>
    </AppShell>
  );
}
