import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getMasters, saveMaster, deleteMaster } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { UNITS } from "@/lib/txn";

export const Route = createFileRoute("/masters")({
  head: () => ({
    meta: [
      { title: "Masters · Studio Ledger" },
      {
        name: "description",
        content: "Manage products, materials, sales channels, customers and operators.",
      },
      { property: "og:title", content: "Masters · Studio Ledger" },
      { property: "og:description", content: "Manage products, materials, channels, customers and operators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getMasters(),
  errorComponent: ({ error }) => (
    <div className="px-5 py-24 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: Masters,
});

type Table = "products" | "materials" | "channels" | "customers" | "operators";

const TABS: { key: Table; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "materials", label: "Materials" },
  { key: "channels", label: "Channels" },
  { key: "customers", label: "Customers" },
  { key: "operators", label: "Operators" },
];

type Row = Record<string, unknown> & { id: string; name: string; active?: boolean };

function Masters() {
  const masters = Route.useLoaderData();
  const router = useRouter();
  const save = useServerFn(saveMaster);
  const remove = useServerFn(deleteMaster);

  const [tab, setTab] = useState<Table>("products");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [variant, setVariant] = useState("");
  const [size, setSize] = useState("");
  const [unit, setUnit] = useState<string>("pcs");
  const [role, setRole] = useState("Operator");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = (masters as unknown as Record<string, Row[]>)[tab] ?? [];

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required.");
    const values: Record<string, unknown> = { name: name.trim() };
    if (tab === "products") {
      values["sku"] = sku.trim() || name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 24);
      values["variant"] = variant.trim() || null;
      values["size"] = size.trim() || null;
    }
    if (tab === "materials") values["default_unit"] = unit;
    if (tab === "operators") values["role"] = role.trim() || "Operator";
    setBusy(true);
    try {
      await save({ data: { table: tab, values } });
      setName("");
      setSku("");
      setVariant("");
      setSize("");
      router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: Row) {
    await save({ data: { table: tab, id: row.id, values: { active: !row.active } } });
    router.invalidate();
  }

  async function onDelete(row: Row) {
    setError(null);
    try {
      await remove({ data: { table: tab, id: row.id } });
      router.invalidate();
    } catch {
      setError("That record is used by existing entries — deactivate it instead.");
    }
  }

  return (
    <AppShell title="Masters" subtitle="The lists that feed every dropdown in the app.">
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.key
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t.label} <span className="opacity-60">{((masters as unknown as Record<string, Row[]>)[t.key] ?? []).length}</span>
          </button>
        ))}
      </div>

      <form onSubmit={onAdd} className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[200px] flex-1">
          <span className="label-plain">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field mt-1.5 focus:field-focus"
            placeholder={`New ${TABS.find((t) => t.key === tab)!.label.slice(0, -1).toLowerCase()}`}
          />
        </label>

        {tab === "products" ? (
          <>
            <label className="w-36">
              <span className="label-plain">SKU</span>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className="field mt-1.5 focus:field-focus" placeholder="Auto" />
            </label>
            <label className="w-32">
              <span className="label-plain">Variant</span>
              <input value={variant} onChange={(e) => setVariant(e.target.value)} className="field mt-1.5 focus:field-focus" />
            </label>
            <label className="w-28">
              <span className="label-plain">Size</span>
              <input value={size} onChange={(e) => setSize(e.target.value)} className="field mt-1.5 focus:field-focus" />
            </label>
          </>
        ) : null}

        {tab === "materials" ? (
          <label className="w-36">
            <span className="label-plain">Default unit</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="field mt-1.5 focus:field-focus">
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
        ) : null}

        {tab === "operators" ? (
          <label className="w-40">
            <span className="label-plain">Role</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} className="field mt-1.5 focus:field-focus" />
          </label>
        ) : null}

        <button
          disabled={busy}
          className="rounded bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error ? <p className="mb-4 text-sm font-semibold text-destructive">{error}</p> : null}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="label-plain px-4 py-3">Name</th>
              {tab === "products" ? <th className="label-plain px-4 py-3">SKU</th> : null}
              {tab === "products" ? <th className="label-plain px-4 py-3">Variant / Size</th> : null}
              {tab === "materials" ? <th className="label-plain px-4 py-3">Default unit</th> : null}
              {tab === "operators" ? <th className="label-plain px-4 py-3">Role</th> : null}
              <th className="label-plain px-4 py-3">Status</th>
              <th className="label-plain px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/50">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                {tab === "products" ? (
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{String(row["sku"] ?? "")}</td>
                ) : null}
                {tab === "products" ? (
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {[row["variant"], row["size"]].filter(Boolean).join(" · ") || "—"}
                  </td>
                ) : null}
                {tab === "materials" ? (
                  <td className="px-4 py-3 text-muted-foreground">{String(row["default_unit"] ?? "")}</td>
                ) : null}
                {tab === "operators" ? (
                  <td className="px-4 py-3 text-muted-foreground">{String(row["role"] ?? "")}</td>
                ) : null}
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(row)}
                    className={`text-xs font-semibold ${row.active ? "text-received" : "text-muted-foreground"}`}
                  >
                    {row.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(row)}
                    className="rounded border border-input px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
