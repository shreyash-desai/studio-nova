import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { TYPE_LABEL, TYPE_SWATCH, fmtDate, fmtQty, label, type TxnRow } from "@/lib/txn";

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold">
      <span className={`h-2 w-2 rounded-full ${TYPE_SWATCH[type] ?? "bg-muted"}`} />
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

export function Stat({
  label: l,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  accent?: string | undefined;
}) {
  return (
    <div className="panel p-6">
      <div className="flex items-center gap-2">
        {accent ? <span className={`h-2 w-2 rounded-full ${accent}`} /> : null}
        <span className="label-plain">{l}</span>
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="panel px-8 py-20 text-center text-sm text-muted-foreground">{children}</div>
  );
}

export function TxnTable({
  rows,
  showDate = true,
  onReverse,
}: {
  rows: TxnRow[];
  showDate?: boolean;
  onReverse?: (row: TxnRow) => Promise<void> | void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (rows.length === 0) return <EmptyState>No entries yet.</EmptyState>;
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="label-plain px-4 py-3">Ref</th>
            {showDate ? <th className="label-plain px-4 py-3">Date</th> : null}
            <th className="label-plain px-4 py-3">Type</th>
            <th className="label-plain px-4 py-3">Item</th>
            <th className="label-plain px-4 py-3 text-right">Qty</th>
            <th className="label-plain px-4 py-3">Detail</th>
            {onReverse ? <th className="label-plain px-4 py-3" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/50">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                {r.ref}
                {r.edited ? <span className="ml-1 text-accent">•</span> : null}
              </td>
              {showDate ? (
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {fmtDate(r.occurred_on)}
                </td>
              ) : null}
              <td className="px-4 py-3">
                <TypeBadge type={r.type} />
              </td>
              <td className="px-4 py-3 font-medium">{label(r)}</td>
              <td
                className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${r.qty < 0 ? "text-destructive" : ""}`}
              >
                {fmtQty(r.qty)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{r.unit ?? ""}</span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {[
                  r.channel?.name,
                  r.customer?.name,
                  r.order_number,
                  r.condition,
                  r.invoice_item,
                  r.delivered_by,
                  r.delivery_ref_no,
                  r.notes,
                  r.operator ? `Added by ${r.operator.name}` : undefined,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </td>
              {onReverse ? (
                <td className="px-4 py-3 text-right">
                  {r.type === "sold" ? (
                    <Link
                      to="/dispatch/$id"
                      params={{ id: r.id }}
                      className="mr-3 rounded-full border border-input px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-foreground hover:text-background transition-all"
                    >
                      Dispatch
                    </Link>
                  ) : null}
                  {r.reversal_of ? (
                    <span className="text-xs text-muted-foreground">reversal</span>
                  ) : (
                    <button
                      disabled={busyId === r.id}
                      onClick={async () => {
                        if (busyId) return;
                        setBusyId(r.id);
                        try {
                          await onReverse(r);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="rounded-full border border-input px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {busyId === r.id ? "Reversing..." : "Reverse"}
                    </button>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
