import { db } from "./gate.server";

export const TXN_SELECT =
  "id, ref, type, occurred_on, qty, unit, order_number, unit_price, reason, condition, notes, reversal_of, edited, created_at, product:products(id,name,sku), material:materials(id,name), channel:channels(id,name), customer:customers(id,name)";

export type EntryInput = {
  type: "received" | "used" | "printed" | "sold" | "return";
  occurred_on?: string | null;
  product_id?: string | null;
  material_id?: string | null;
  qty: number;
  unit?: string | null;
  channel_id?: string | null;
  customer_id?: string | null;
  order_number?: string | null;
  unit_price?: number | null;
  reason?: string | null;
  condition?: string | null;
  notes?: string | null;
};

function pad(n: number) {
  return String(n).padStart(5, "0");
}

export async function nextRef(prefix: "TXN" | "REV") {
  const client = await db();
  const seq = prefix === "TXN" ? "txn_seq" : "rev_seq";
  const { data, error } = await client.rpc("nextval_public" as never, { seq_name: seq } as never);
  if (!error && typeof data === "number") {
    return `${prefix}-${new Date().getUTCFullYear()}-${pad(data)}`;
  }
  // Fallback: count-based reference.
  const client2 = await db();
  const { count } = await client2
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .like("ref", `${prefix}-%`);
  return `${prefix}-${new Date().getUTCFullYear()}-${pad((count ?? 0) + 1)}`;
}

export async function logAudit(
  action: string,
  entity: string,
  entityId: string | null,
  detail: Record<string, unknown>,
) {
  const client = await db();
  await client.from("audit_log").insert({ action, entity, entity_id: entityId, detail });
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
