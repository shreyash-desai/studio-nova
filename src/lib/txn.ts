export type Named = { id: string; name: string } | null;

export type TxnRow = {
  id: string;
  ref: string;
  type: "received" | "used" | "printed" | "sold" | "return";
  occurred_on: string;
  qty: number;
  order_number: string | null;
  condition: string | null;
  notes: string | null;
  reason?: string | null;
  reversal_of: string | null;
  edited: boolean;
  created_at: string;
  invoice_item: string | null;
  delivered_by: string | null;
  delivery_ref_no: string | null;
  dispatch_number: string | null;
  tick_item_photo: boolean;
  tick_send_tracking: boolean;
  tick_send_invoice: boolean | null;
  tick_sent?: boolean | null;
  tick_return?: boolean | null;
  photo_url?: string | null;
  added_by: string | null;
  unit: string | null;
  unit_price: number | null;
  product: { id: string; name: string; sku: string | null } | null;
  material: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  customer: { id: string; name: string } | null;
  operator: { id: string; name: string } | null;
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

export const CONDITIONS = ["Resellable", "Damaged", "Repairable"];

// The 5 official online marketplace categories
export const ONLINE_CATEGORIES = ["Amazon", "Pepperfry", "Flipkart", "Claymango", "Website"] as const;

export function isOnlineChannel(channelName?: string | null): boolean {
  if (!channelName) return false;
  const clean = channelName.trim().toLowerCase();
  return (
    clean === "amazon" ||
    clean.includes("pepperfry") ||
    clean === "flipkart" ||
    clean === "claymango" ||
    clean === "website"
  );
}

export function isCustom3D(row: { product?: { name?: string | null; sku?: string | null } | null } | null | undefined): boolean {
  if (!row?.product) return false;
  const name = (row.product.name ?? "").toLowerCase();
  const sku = (row.product.sku ?? "").toLowerCase();
  return name.includes("custom 3d") || name.includes("custom-3d") || sku.includes("custom-3d");
}

export function parseDispatchMeta(row: TxnRow) {
  let meta: { tick_sent?: boolean; tick_return?: boolean; photo_url?: string | null } = {};
  if (row.reason && row.reason.startsWith("{") && row.reason.endsWith("}")) {
    try {
      meta = JSON.parse(row.reason);
    } catch {
      // ignore JSON parse errors
    }
  }
  return {
    tick_sent: row.tick_sent ?? meta.tick_sent ?? false,
    tick_return: row.tick_return ?? meta.tick_return ?? false,
    photo_url: row.photo_url ?? meta.photo_url ?? null,
  };
}

export function todayISO() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Formatted by hand: Intl output differs between the server runtime and the
// browser (ICU data), which breaks hydration.
export function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m! - 1]} ${y}`;
}

export function fmtDayLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()];
  return `${weekday}, ${d} ${MONTHS_LONG[m! - 1]} ${y}`;
}

export function fmtQty(n: number) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

function groupIN(n: number) {
  const neg = n < 0;
  const s = String(Math.abs(n));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return (neg ? "-" : "") + grouped;
}

export function fmtMoney(n: number) {
  return "₹" + groupIN(Math.round(n));
}

export function label(row: TxnRow) {
  return row.product?.name ?? row.material?.name ?? "—";
}
