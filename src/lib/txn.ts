export type Named = { id: string; name: string } | null;

export type TxnRow = {
  id: string;
  ref: string;
  type: "received" | "used" | "printed" | "sold" | "return";
  occurred_on: string;
  qty: number;
  unit: string | null;
  order_number: string | null;
  unit_price: number | null;
  reason: string | null;
  condition: string | null;
  notes: string | null;
  reversal_of: string | null;
  edited: boolean;
  created_at: string;
  product: ({ id: string; name: string; sku?: string } | null) | null;
  material: Named;
  channel: Named;
  customer: Named;
};

export const TYPES = ["received", "used", "printed", "sold", "return"] as const;

export const TYPE_LABEL: Record<string, string> = {
  received: "Received",
  used: "Used",
  printed: "Printed",
  sold: "Sold",
  return: "Return",
};

export const TYPE_SWATCH: Record<string, string> = {
  received: "bg-received",
  used: "bg-used",
  printed: "bg-printed",
  sold: "bg-sold",
  return: "bg-return",
};

export const UNITS = ["kg", "g", "pcs", "metres", "rolls", "sets"] as const;

export const REASONS = ["Production", "Sample", "Wastage", "Testing", "Maintenance", "Other"];
export const CONDITIONS = ["Resellable", "Damaged", "Repair required", "Replacement", "Scrap"];

export function todayISO() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function fmtDayLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function fmtQty(n: number) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

export function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function label(row: TxnRow) {
  return row.product?.name ?? row.material?.name ?? "—";
}
