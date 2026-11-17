import { gatedLoad } from "@/lib/gated";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getDispatches, updateDispatch } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { fmtDate, fmtQty, label, isOnlineChannel, parseDispatchMeta, type TxnRow } from "@/lib/txn";
import { CheckCircle2, Truck, RotateCcw, PackageCheck, AlertCircle, Camera } from "lucide-react";

export const Route = createFileRoute("/dispatches")({
  head: () => ({
    meta: [
      { title: "Dispatch Dashboard · Studio Nova" },
      { name: "description", content: "B2B and Online marketplace dispatch fulfillment checklists." },
    ],
  }),
  loader: () => gatedLoad(getDispatches()),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{(error as any)?.message || String(error)}</div>
  ),
  component: Dispatches,
});

type InvoiceGroup = {
  invoice_item: string;
  rep: TxnRow;
  rows: TxnRow[];
  meta: ReturnType<typeof parseDispatchMeta>;
};

type OnlineOrderGroup = {
  key: string;
  order_number: string;
  channel_name: string;
  rep: TxnRow;
  rows: TxnRow[];
  meta: ReturnType<typeof parseDispatchMeta>;
};

function groupB2BInvoices(rows: TxnRow[]): InvoiceGroup[] {
  const map = new Map<string, TxnRow[]>();

  for (const row of rows) {
    const ch = row.channel?.name || "";
    if (isOnlineChannel(ch)) continue; // Online channels go to Dispatch 2
    const key = row.invoice_item?.trim() || `NO-INV-${row.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  return [...map.entries()]
    .map(([invoice_item, groupRows]) => ({
      invoice_item,
      rep: groupRows[0]!,
      rows: groupRows,
      meta: parseDispatchMeta(groupRows[0]!),
    }))
    .sort((a, b) => (b.rep.occurred_on !== a.rep.occurred_on ? (b.rep.occurred_on > a.rep.occurred_on ? 1 : -1) : a.invoice_item.localeCompare(b.invoice_item)));
}

function groupOnlineOrders(rows: TxnRow[]): OnlineOrderGroup[] {
  const map = new Map<string, TxnRow[]>();

  for (const row of rows) {
    const ch = row.channel?.name || "";
    if (!isOnlineChannel(ch)) continue; // B2B goes to Dispatch 1
    const key = row.order_number?.trim() || row.invoice_item?.trim() || `ORDER-${row.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  return [...map.entries()]
    .map(([key, groupRows]) => ({
      key,
      order_number: groupRows[0]!.order_number || key,
      channel_name: groupRows[0]!.channel?.name || "Online",
      rep: groupRows[0]!,
      rows: groupRows,
      meta: parseDispatchMeta(groupRows[0]!),
    }))
    .sort((a, b) => (b.rep.occurred_on !== a.rep.occurred_on ? (b.rep.occurred_on > a.rep.occurred_on ? 1 : -1) : b.key.localeCompare(a.key)));
}

function Dispatches() {
  const { rows } = Route.useLoaderData() as { rows: TxnRow[] };
  const router = useRouter();
  const save = useServerFn(updateDispatch);

  // Two main boards per client mandate:
  // 1: B2B & Others
  // 2: Online Dispatches (5 Categories: Amazon, Pepperfry, Flipkart, Claymango, Website)
  const [board, setBoard] = useState<"b2b" | "online">("b2b");
  const [statusFilter, setStatusFilter] = useState<"pending" | "sent" | "return" | "all">("pending");
  const [onlineChannelFilter, setOnlineChannelFilter] = useState<string>("all");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const b2bGroups = useMemo(() => groupB2BInvoices(rows), [rows]);
  const onlineGroups = useMemo(() => groupOnlineOrders(rows), [rows]);

  // Filter B2B
  const visibleB2B = useMemo(() => {
    return b2bGroups.filter((g) => {
      const isSent = g.meta.tick_sent;
      const isReturn = g.meta.tick_return;
      if (statusFilter === "pending") return !isSent && !isReturn;
      if (statusFilter === "sent") return isSent && !isReturn;
      if (statusFilter === "return") return isReturn;
      return true;
    });
  }, [b2bGroups, statusFilter]);

  // Filter Online
  const visibleOnline = useMemo(() => {
    return onlineGroups.filter((g) => {
      const isSent = g.meta.tick_sent;
      const isReturn = g.meta.tick_return;
      const matchesStatus =
        statusFilter === "pending"
          ? !isSent && !isReturn
          : statusFilter === "sent"
          ? isSent && !isReturn
          : statusFilter === "return"
          ? isReturn
          : true;

      const ch = g.channel_name.toLowerCase();
      const matchesChannel =
        onlineChannelFilter === "all"
          ? true
          : ch.includes(onlineChannelFilter.toLowerCase());

      return matchesStatus && matchesChannel;
    });
  }, [onlineGroups, statusFilter, onlineChannelFilter]);

  async function updateField(
    target: { invoice_item?: string; id?: string; order_number?: string },
    field: string,
    value: unknown,
  ) {
    const key = target.invoice_item || target.id || target.order_number || "target";
    setSavingKey(key);
    try {
      const payload: Record<string, unknown> = { ...target };
      payload[field] = value;
      // If photo is saved, also automatically check tick_item_photo
      if (field === "photo_url") {
        payload["tick_item_photo"] = !!value;
      }
      await save({ data: payload as Parameters<typeof save>[0]["data"] });
      router.invalidate();
    } catch {
      alert("Failed to update dispatch status.");
    } finally {
      setSavingKey(null);
    }
  }

  const onlineCategoriesList = ["All", "Amazon", "Pepperfry", "Flipkart", "Claymango", "Website"];

  return (
    <AppShell
      title="Dispatch Dashboard"
      subtitle="Fulfillment checklists, tracking numbers and parcel verification"
    >
      {/* 1. Primary Board Selector: Dispatches 1 (B2B) vs Dispatches 2 (Online) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBoard("b2b")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              board === "b2b"
                ? "bg-foreground text-background shadow-md"
                : "border border-input text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Dispatches 1: B2B &amp; Others</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${board === "b2b" ? "bg-background/20 text-background" : "bg-secondary text-muted-foreground"}`}>
              {b2bGroups.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBoard("online")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              board === "online"
                ? "bg-foreground text-background shadow-md"
                : "border border-input text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Dispatches 2: Online Dispatches</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${board === "online" ? "bg-background/20 text-background" : "bg-secondary text-muted-foreground"}`}>
              {onlineGroups.length}
            </span>
          </button>
        </div>

        {/* Status Filters: Pending / Sent / Return / All */}
        <div className="flex items-center gap-1.5 bg-secondary/60 p-1 rounded-full">
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
              statusFilter === "pending"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("sent")}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
              statusFilter === "sent"
                ? "bg-green-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sent / Dispatched
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("return")}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
              statusFilter === "return"
                ? "bg-red-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Returns
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Online Category Pills (For Dispatches 2) */}
      {board === "online" && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground mr-1">5 Categories:</span>
          {onlineCategoriesList.map((cat) => {
            const active = cat.toLowerCase() === onlineChannelFilter.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setOnlineChannelFilter(cat.toLowerCase())}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-input text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Board 1: B2B & Others Dispatches */}
      {board === "b2b" && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-plain px-4 py-3">Invoice &amp; Date</th>
                <th className="label-plain px-4 py-3">Customer</th>
                <th className="label-plain px-4 py-3">Products</th>
                <th className="label-plain px-4 py-3">Tracking / Delivery No</th>
                <th className="label-plain px-4 py-3 text-center">Checkout Photo</th>
                <th className="label-plain px-4 py-3 text-center">Sent ✓</th>
                <th className="label-plain px-4 py-3 text-center">Return ✗</th>
                <th className="label-plain px-4 py-3 text-center">Inv Sent</th>
                <th className="label-plain px-4 py-3 text-center">Track Sent</th>
                <th className="label-plain px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleB2B.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-muted-foreground">
                    No B2B dispatches found in this view.
                  </td>
                </tr>
              ) : (
                visibleB2B.map((group) => {
                  const saving = savingKey === group.invoice_item;
                  const isSent = group.meta.tick_sent;
                  const isReturn = group.meta.tick_return;

                  return (
                    <tr
                      key={group.invoice_item}
                      className={`border-b border-border/60 hover:bg-secondary/40 transition-colors ${
                        isReturn ? "bg-red-500/5" : isSent ? "bg-green-500/5" : ""
                      }`}
                    >
                      {/* Invoice & Date */}
                      <td className="px-4 py-3">
                        <div className="font-semibold font-mono text-xs">{group.invoice_item}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {fmtDate(group.rep.occurred_on)}
                        </div>
                        {group.rep.order_number ? (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            PO #{group.rep.order_number}
                          </div>
                        ) : null}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm">
                          {group.rep.customer?.name ?? group.rep.channel?.name ?? <span className="text-muted-foreground">—</span>}
                        </div>
                        {group.rep.delivered_by ? (
                          <div className="text-xs text-muted-foreground">Via: {group.rep.delivered_by}</div>
                        ) : null}
                      </td>

                      {/* Products */}
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

                      {/* Tracking / Dispatch No */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          defaultValue={group.rep.dispatch_number || group.rep.delivery_ref_no || ""}
                          onBlur={(e) => {
                            if (e.target.value !== (group.rep.dispatch_number || "")) {
                              updateField({ invoice_item: group.invoice_item }, "dispatch_number", e.target.value);
                            }
                          }}
                          placeholder="LR / Tracking #"
                          className="w-full max-w-[150px] rounded border border-input bg-background px-2.5 py-1 text-xs focus:border-foreground focus:outline-none"
                          disabled={saving}
                        />
                      </td>

                      {/* Photo Button (Placeholder, does not work per request) */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border border-input text-muted-foreground bg-secondary/40 cursor-not-allowed opacity-75"
                          title="Photo placeholder"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Photo</span>
                        </button>
                      </td>

                      {/* Sent Ka Tick */}
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSent}
                            onChange={(e) => updateField({ invoice_item: group.invoice_item }, "tick_sent", e.target.checked)}
                            disabled={saving}
                            className="h-4 w-4 cursor-pointer rounded border-input accent-green-600"
                          />
                        </label>
                      </td>

                      {/* Return Ka Tick */}
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isReturn}
                            onChange={(e) => updateField({ invoice_item: group.invoice_item }, "tick_return", e.target.checked)}
                            disabled={saving}
                            className="h-4 w-4 cursor-pointer rounded border-input accent-red-600"
                          />
                        </label>
                      </td>

                      {/* Invoice Sent */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={group.rep.tick_send_invoice || false}
                          onChange={(e) => updateField({ invoice_item: group.invoice_item }, "tick_send_invoice", e.target.checked)}
                          disabled={saving}
                          className="h-4 w-4 cursor-pointer rounded border-input"
                        />
                      </td>

                      {/* Tracking Sent */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={group.rep.tick_send_tracking || false}
                          onChange={(e) => updateField({ invoice_item: group.invoice_item }, "tick_send_tracking", e.target.checked)}
                          disabled={saving}
                          className="h-4 w-4 cursor-pointer rounded border-input"
                        />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/dispatch/$invoiceItem"
                          params={{ invoiceItem: encodeURIComponent(group.invoice_item) }}
                          className="rounded-full border border-input px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-foreground hover:text-background hover:border-foreground transition-all whitespace-nowrap"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Board 2: Online Dispatches (Amazon, Pepperfry, Flipkart, Claymango, Website) */}
      {board === "online" && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-plain px-4 py-3">Channel</th>
                <th className="label-plain px-4 py-3">Order Number &amp; Date</th>
                <th className="label-plain px-4 py-3">Items &amp; Qty</th>
                <th className="label-plain px-4 py-3">Tracking ID / AWB</th>
                <th className="label-plain px-4 py-3 text-center">Checkout Photo</th>
                <th className="label-plain px-4 py-3 text-center">Sent ✓</th>
                <th className="label-plain px-4 py-3 text-center">Return ✗</th>
                <th className="label-plain px-4 py-3 text-center">Tracking Sent</th>
              </tr>
            </thead>
            <tbody>
              {visibleOnline.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                    No online marketplace orders found for this category filter.
                  </td>
                </tr>
              ) : (
                visibleOnline.map((order) => {
                  const saving = savingKey === order.key;
                  const isSent = order.meta.tick_sent;
                  const isReturn = order.meta.tick_return;

                  return (
                    <tr
                      key={order.key}
                      className={`border-b border-border/60 hover:bg-secondary/40 transition-colors ${
                        isReturn ? "bg-red-500/5" : isSent ? "bg-green-500/5" : ""
                      }`}
                    >
                      {/* Marketplace Channel Badge */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-foreground px-2.5 py-1 text-xs font-bold text-background shadow-xs">
                          {order.channel_name}
                        </span>
                      </td>

                      {/* Order Number & Date */}
                      <td className="px-4 py-3">
                        <div className="font-semibold font-mono text-xs">{order.order_number}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {fmtDate(order.rep.occurred_on)}
                        </div>
                      </td>

                      {/* Products */}
                      <td className="px-4 py-3">
                        <ul className="space-y-0.5">
                          {order.rows.map((r) => (
                            <li key={r.id} className="text-xs">
                              <span className="font-medium">{label(r)}</span>
                              <span className="text-muted-foreground"> × {fmtQty(r.qty)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>

                      {/* Tracking ID / AWB — Editable Inline */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          defaultValue={order.rep.dispatch_number || ""}
                          onBlur={(e) => {
                            if (e.target.value !== (order.rep.dispatch_number || "")) {
                              updateField({ order_number: order.order_number, id: order.rep.id }, "dispatch_number", e.target.value);
                            }
                          }}
                          placeholder="AWB / Tracking #"
                          className="w-full max-w-[180px] rounded border border-input bg-background px-2.5 py-1 text-xs focus:border-foreground focus:outline-none font-mono"
                          disabled={saving}
                        />
                      </td>

                      {/* Photo Button (Placeholder, does not work per request) */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border border-input text-muted-foreground bg-secondary/40 cursor-not-allowed opacity-75"
                          title="Photo placeholder"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Photo</span>
                        </button>
                      </td>

                      {/* Sent Ka Tick */}
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSent}
                            onChange={(e) =>
                              updateField({ order_number: order.order_number, id: order.rep.id }, "tick_sent", e.target.checked)
                            }
                            disabled={saving}
                            className="h-4 w-4 cursor-pointer rounded border-input accent-green-600"
                          />
                        </label>
                      </td>

                      {/* Return Ka Tick */}
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isReturn}
                            onChange={(e) =>
                              updateField({ order_number: order.order_number, id: order.rep.id }, "tick_return", e.target.checked)
                            }
                            disabled={saving}
                            className="h-4 w-4 cursor-pointer rounded border-input accent-red-600"
                          />
                        </label>
                      </td>

                      {/* Tracking Sent */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={order.rep.tick_send_tracking || false}
                          onChange={(e) =>
                            updateField({ order_number: order.order_number, id: order.rep.id }, "tick_send_tracking", e.target.checked)
                          }
                          disabled={saving}
                          className="h-4 w-4 cursor-pointer rounded border-input"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
