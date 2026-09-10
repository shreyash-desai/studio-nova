import { createServerFn } from "@tanstack/react-start";

export const getPublicOperators = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./gate.server");
  const client = await db();
  const { data } = await client.from("operators").select("id, name, role").eq("active", true).order("name");
  return { operators: data ?? [] };
});

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string; operatorId: string; operatorName: string; operatorRole: string }) => data)
  .handler(async ({ data }) => {
    const { getGateSession, passwordMatches } = await import("./gate.server");
    const expected = process.env["SITE_PASSWORD"];
    if (!expected) throw new Error("SITE_PASSWORD is not set");
    if (!data.password || !passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }
    const session = await getGateSession();
    await session.update({
      unlocked: true,
      operatorId: data.operatorId,
      operatorName: data.operatorName,
      operatorRole: data.operatorRole,
    });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const { getGateSession } = await import("./gate.server");
  const session = await getGateSession();
  await session.clear();
  return { ok: true as const };
});

export const getMasters = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUnlocked, db } = await import("./gate.server");
  const session = await requireUnlocked();
  const client = await db();
  const [products, materials, channels, customers, operators, bom] = await Promise.all([
    client.from("products").select("*").order("name"),
    client.from("materials").select("*").order("name"),
    client.from("channels").select("*").order("name"),
    client.from("customers").select("*").order("name"),
    client.from("operators").select("*").order("name"),
    client
      .from("bom_lines")
      .select("id, qty, unit, product:products(id,name), material:materials(id,name)")
      .order("created_at"),
  ]);
  return {
    products: products.data ?? [],
    materials: (materials.data ?? []).map((m) => ({ ...m, unit: m.default_unit })),
    channels: channels.data ?? [],
    customers: customers.data ?? [],
    operators: operators.data ?? [],
    bom: bom.data ?? [],
    operatorId: session.data.operatorId,
  };
});

export const createEntry = createServerFn({ method: "POST" })
  .inputValidator((data: import("./ledger.server").EntryInput) => data)
  .handler(async ({ data }) => {
    const { requireUnlocked, db } = await import("./gate.server");
    const { nextRef, logAudit, todayISO } = await import("./ledger.server");
    const session = await requireUnlocked();
    if (!data.qty || Number(data.qty) <= 0) throw new Error("Quantity must be greater than zero");
    const client = await db();
    const ref = await nextRef("TXN");
    const row = {
      ref,
      type: data.type,
      occurred_on: data.occurred_on || todayISO(),
      product_id: data.product_id || null,
      material_id: data.material_id || null,
      qty: Number(data.qty),
      unit: (data.unit || null) as never,
      channel_id: data.channel_id || null,
      customer_id: data.customer_id || null,
      order_number: data.order_number || null,
      unit_price: data.unit_price ?? null,
      reason: data.reason || null,
      condition: data.condition || null,
      notes: data.notes || null,
      invoice_item: data.type === "sold" ? data.invoice_item || null : null,
      delivered_by: data.type === "sold" ? data.delivered_by || null : null,
      delivery_ref_no: data.type === "sold" ? data.delivery_ref_no || null : null,
      order_date: data.type === "sold" ? data.order_date || null : null,
      added_by: data.added_by || session.data.operatorId || null,
    };
    const { data: inserted, error } = await client
      .from("transactions")
      .insert(row as never)
      .select("id, ref")
      .single();
    if (error) throw new Error(error.message);
    await logAudit("create", "transaction", inserted.id, { ref: inserted.ref, type: data.type });
    return inserted;
  });

export const updateEntry = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; qty?: number; notes?: string | null; order_number?: string | null }) => data)
  .handler(async ({ data }) => {
    const { requireUnlocked, db } = await import("./gate.server");
    const { logAudit } = await import("./ledger.server");
    await requireUnlocked();
    const client = await db();
    const patch: Record<string, unknown> = { edited: true };
    if (data.qty !== undefined) patch["qty"] = Number(data.qty);
    if (data.notes !== undefined) patch["notes"] = data.notes || null;
    if (data.order_number !== undefined) patch["order_number"] = data.order_number || null;
    const { error } = await client.from("transactions").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit("update", "transaction", data.id, patch);
    return { ok: true as const };
  });

export const getEntry = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlocked, db } = await import("./gate.server");
    const { TXN_SELECT } = await import("./ledger.server");
    await requireUnlocked();
    const client = await db();
    const { data: row, error } = await client
      .from("transactions")
      .select(TXN_SELECT)
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Entry not found");
    return { row: row as import("./txn").TxnRow };
  });

export const updateDispatch = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      dispatch_number?: string | null;
      tick_item_photo?: boolean;
      tick_send_tracking?: boolean;
      tick_send_invoice?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { requireUnlocked, db } = await import("./gate.server");
    const { logAudit } = await import("./ledger.server");
    await requireUnlocked();
    const client = await db();
    const patch: Record<string, unknown> = {};
    if (data.dispatch_number !== undefined) patch["dispatch_number"] = data.dispatch_number || null;
    if (data.tick_item_photo !== undefined) patch["tick_item_photo"] = data.tick_item_photo;
    if (data.tick_send_tracking !== undefined) patch["tick_send_tracking"] = data.tick_send_tracking;
    if (data.tick_send_invoice !== undefined) patch["tick_send_invoice"] = data.tick_send_invoice;
    
    if (Object.keys(patch).length === 0) return { ok: true as const };
    
    const { error } = await client.from("transactions").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit("update", "transaction_dispatch", data.id, patch);
    return { ok: true as const };
  });

export const reverseEntry = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; note?: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlocked, db } = await import("./gate.server");
    const { nextRef, logAudit } = await import("./ledger.server");
    const session = await requireUnlocked();
    const client = await db();
    const { data: original, error: readErr } = await client
      .from("transactions")
      .select("*")
      .eq("id", data.id)
      .single();
    if (readErr || !original) throw new Error(readErr?.message ?? "Entry not found");
    const ref = await nextRef("REV");
    const { error } = await client.from("transactions").insert({
      ref,
      type: original.type,
      occurred_on: original.occurred_on,
      product_id: original.product_id,
      material_id: original.material_id,
      qty: -Number(original.qty),
      unit: original.unit,
      channel_id: original.channel_id,
      customer_id: original.customer_id,
      order_number: original.order_number,
      unit_price: original.unit_price,
      reason: original.reason,
      condition: original.condition,
      notes: data.note || `Reversal of ${original.ref}`,
      reversal_of: original.id,
      invoice_item: original.invoice_item,
      delivered_by: original.delivered_by,
      delivery_ref_no: original.delivery_ref_no,
      order_date: original.order_date,
      added_by: session.data.operatorId || null,
    });
    if (error) throw new Error(error.message);
    await client.from("transactions").update({ voided: true }).eq("id", original.id);
    await logAudit("reverse", "transaction", original.id, { ref: original.ref, reversal: ref });
    return { ok: true as const, ref };
  });

export const getDayLog = createServerFn({ method: "GET" })
  .inputValidator((data: { month: string; date: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlocked, db } = await import("./gate.server");
    const { monthRange, fetchRange, TXN_SELECT } = await import("./ledger.server");
    await requireUnlocked();
    const { start, end } = monthRange(data.month);
    const month = await fetchRange(start, end);
    const client = await db();
    const { data: day } = await client
      .from("transactions")
      .select(TXN_SELECT)
      .eq("occurred_on", data.date)
      .order("created_at", { ascending: true });
    const counts = new Map<string, number>();
    for (const row of month) counts.set(row.occurred_on, (counts.get(row.occurred_on) ?? 0) + 1);
    return {
      days: [...counts.entries()]
        .map(([date, lines]) => ({ date, lines }))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
      entries: day ?? [],
    };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .inputValidator((data: { year: string; today: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlocked } = await import("./gate.server");
    const { yearRange, fetchRange } = await import("./ledger.server");
    await requireUnlocked();
    const { start, end } = yearRange(data.year);
    const rows = await fetchRange(start, end);
    return { rows, today: data.today, year: data.year };
  });

export const getLedger = createServerFn({ method: "GET" })
  .inputValidator((data: { start: string; end: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlocked } = await import("./gate.server");
    const { fetchRange } = await import("./ledger.server");
    await requireUnlocked();
    return { rows: await fetchRange(data.start, data.end) };
  });

export const searchLedger = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlocked, db } = await import("./gate.server");
    const { TXN_SELECT } = await import("./ledger.server");
    await requireUnlocked();
    const q = data.q.trim();
    if (!q) return { rows: [] };
    const client = await db();
    const { data: rows } = await client
      .from("transactions")
      .select(TXN_SELECT)
      .or(`ref.ilike.%${q}%,order_number.ilike.%${q}%,notes.ilike.%${q}%`)
      .order("occurred_on", { ascending: false })
      .limit(200);
    return { rows: rows ?? [] };
  });

export const getAuditLog = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUnlocked, db } = await import("./gate.server");
  await requireUnlocked();
  const client = await db();
  const { data } = await client
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  return { rows: data ?? [] };
});

export const saveMaster = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { table: "products" | "materials" | "channels" | "customers" | "operators" | "bom_lines"; id?: string | null; values: Record<string, unknown> }) => data,
  )
  .handler(async ({ data }) => {
    const { requireUnlocked, db } = await import("./gate.server");
    const { logAudit } = await import("./ledger.server");
    await requireUnlocked();
    const client = await db();
    if (data.id) {
      const { error } = await client.from(data.table).update(data.values as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit("update", data.table, data.id, data.values);
    } else {
      const { error } = await client.from(data.table).insert(data.values as never);
      if (error) throw new Error(error.message);
      await logAudit("create", data.table, null, data.values);
    }
    return { ok: true as const };
  });

export const deleteMaster = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { table: "products" | "materials" | "channels" | "customers" | "operators" | "bom_lines"; id: string }) => data,
  )
  .handler(async ({ data }) => {
    const { requireUnlocked, db } = await import("./gate.server");
    const { logAudit } = await import("./ledger.server");
    await requireUnlocked();
    const client = await db();

    // Manually nullify foreign keys in transactions to bypass RESTRICT constraints,
    // explicitly allowing users to delete Master items even if they have historical data.
    if (data.table === "products") await client.from("transactions").update({ product_id: null }).eq("product_id", data.id);
    if (data.table === "materials") await client.from("transactions").update({ material_id: null }).eq("material_id", data.id);
    if (data.table === "channels") await client.from("transactions").update({ channel_id: null }).eq("channel_id", data.id);
    if (data.table === "customers") await client.from("transactions").update({ customer_id: null }).eq("customer_id", data.id);
    if (data.table === "operators") await client.from("transactions").update({ added_by: null }).eq("added_by", data.id);

    const { error } = await client.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit("delete", data.table, data.id, {});
    return { ok: true as const };
  });
