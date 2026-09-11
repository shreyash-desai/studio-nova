import { db } from "./gate.server";

export const TXN_SELECT =
  "id, ref, type, occurred_on, qty, order_number, unit_price, condition, notes, reversal_of, edited, created_at, invoice_item, delivered_by, delivery_ref_no, dispatch_number, tick_item_photo, tick_send_tracking, tick_send_invoice, added_by, product:products(id,name,sku), material:materials(id,name), channel:channels(id,name), customer:customers(id,name), operator:operators!transactions_added_by_fkey(id,name)";

export type EntryInput = {
  type: "received" | "used" | "printed" | "sold" | "return";
  occurred_on?: string | null;
  product_id?: string | null;
  material_id?: string | null;
  qty: number | string;
  channel_id?: string | null;
  customer_id?: string | null;
  order_number?: string | null;
  unit_price?: number | null;
  condition?: string | null;
  notes?: string | null;
  invoice_item?: string | null;
  delivered_by?: string | null;
  delivery_ref_no?: string | null;
  added_by?: string | null;
};

function pad(n: number) {
  return String(n).padStart(5, "0");
}

export async function nextRef(prefix: "TXN" | "REV") {
  const client = await db();
  const year = new Date().getUTCFullYear();
  const { data } = await client
    .from("transactions")
    .select("ref")
    .like("ref", `${prefix}-%`)
    .order("ref", { ascending: false })
    .limit(1);
  const last = data?.[0]?.ref;
  const n = last ? Number(last.split("-").pop()) + 1 : 1;
  return `${prefix}-${year}-${pad(Number.isFinite(n) ? n : 1)}`;
}


export async function logAudit(
  action: string,
  entity: string,
  entityId: string | null,
  detail: Record<string, unknown>,
) {
  const client = await db();
  await client.from("audit_log").insert({ action, entity, entity_id: entityId, detail: detail as never });
}

export function todayISO() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function monthOf(dateISO: string) {
  return dateISO.slice(0, 7);
}

export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDate = new Date(Date.UTC(y!, m!, 0));
  const end = `${month}-${String(endDate.getUTCDate()).padStart(2, "0")}`;
  return { start, end };
}

export function yearRange(year: string) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export async function fetchRange(start: string, end: string) {
  const client = await db();
  const { data, error } = await client
    .from("transactions")
    .select(TXN_SELECT)
    .gte("occurred_on", start)
    .lte("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  return data ?? [];
}
