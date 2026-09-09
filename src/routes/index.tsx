import { gatedLoad } from "@/lib/gated";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getDashboard } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { Stat, TxnTable } from "@/components/ledger-ui";
import { fmtDayLong, fmtMoney, fmtQty, todayISO, type TxnRow } from "@/lib/txn";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · Studio Ledger" },
      { name: "description", content: "Analytics and today's overview." },
    ],
  }),
  loader: () => {
    const today = todayISO();
    return gatedLoad(getDashboard({ data: { today, year: today.slice(0, 4) } }));
  },
  errorComponent: ({ error }) => <ErrorBox message={error.message} />,
  component: Overview,
});

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Couldn't load the dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function Overview() {
  const { rows, today, year } = Route.useLoaderData() as { rows: TxnRow[]; today: string; year: string };
  const todayRows = rows.filter((r) => r.occurred_on === today);

  const sumQty = (list: TxnRow[], type: string) =>
    list.filter((r) => r.type === type).reduce((a, r) => a + Number(r.qty), 0);

  // Global Stats
  const totalSales = sumQty(rows, "sold");
  const totalReturns = sumQty(rows, "return");
  const totalProduction = sumQty(rows, "printed");
  // Material used in kg (assuming unit might be 'g' or 'kg')
  const materialUsed = rows
    .filter((r) => r.type === "used")
    .reduce((a, r) => {
      const q = Number(r.qty);
      if (r.unit === "g") return a + q / 1000;
      if (r.unit === "kg") return a + q;
      return a + q;
    }, 0);

  // Channel Net Sales (Sold - Returns by channel)
  const channelData = useMemo(() => {
    const channels = ["Amazon", "Claymango", "Pepperfry", "Flipkart", "Local", "B2B"];
    const map = new Map<string, { sold: number; returns: number }>();
    channels.forEach(c => map.set(c.toLowerCase(), { sold: 0, returns: 0 }));

    rows.forEach(r => {
      const cName = r.channel?.name?.toLowerCase();
      if (!cName) return;
      if (!map.has(cName)) map.set(cName, { sold: 0, returns: 0 });
      const stats = map.get(cName)!;
      if (r.type === "sold") stats.sold += Number(r.qty);
      if (r.type === "return") stats.returns += Number(r.qty);
    });

    return Array.from(map.entries()).map(([name, stats]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      net: stats.sold - stats.returns,
      sold: stats.sold,
      returns: stats.returns,
    })).sort((a, b) => b.net - a.net);
  }, [rows]);

  // Monthly Graph Data
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = months.map((m, i) => ({
      name: m,
      monthNum: String(i + 1).padStart(2, "0"),
      Sales: 0,
      Production: 0,
      Returns: 0,
    }));

    rows.forEach(r => {
      const monthIndex = Number(r.occurred_on.slice(5, 7)) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        if (r.type === "sold") data[monthIndex]!.Sales += Number(r.qty);
        if (r.type === "printed") data[monthIndex]!.Production += Number(r.qty);
        if (r.type === "return") data[monthIndex]!.Returns += Number(r.qty);
      }
    });
    return data;
  }, [rows]);

  return (
    <AppShell
      title="Overview"
      subtitle={`${year} Analytics · ${fmtDayLong(today)}`}
      actions={
        <Link
          to="/entry"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground shadow-sm hover:opacity-90 hover:shadow transition-all"
        >
          + New Entry
        </Link>
      }
    >
      {/* Global Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Stat label="Total Sales (YTD)" value={fmtQty(totalSales)} accent="bg-green-500" hint="Total units sold" />
        <Stat label="Total Returns (YTD)" value={fmtQty(totalReturns)} accent="bg-red-500" hint="Total units returned" />
        <Stat label="Total Production (YTD)" value={fmtQty(totalProduction)} accent="bg-blue-500" hint="Total units printed" />
        <Stat label="Material Used (YTD)" value={`${fmtQty(materialUsed)} kg`} accent="bg-yellow-500" hint="Filament/Resin" />
      </section>

      <div className="grid gap-8 lg:grid-cols-3 mb-8">
        {/* Yearly Graph */}
        <section className="panel p-6 lg:col-span-2 shadow-sm rounded-2xl bg-card border-border/50">
          <h2 className="font-display text-lg font-bold mb-6">Monthly Production vs Sales</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip 
                  cursor={{ fill: "hsl(var(--secondary))" }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />
                <Bar dataKey="Production" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Sales" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Channel Breakdown */}
        <section className="panel p-6 shadow-sm rounded-2xl bg-card border-border/50">
          <h2 className="font-display text-lg font-bold mb-6">Net Sales by Channel</h2>
          <div className="space-y-5">
            {channelData.map((c) => (
              <div key={c.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="font-semibold text-sm">{c.name}</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="font-bold">{fmtQty(c.net)}</span>
                  <span className="text-[10px] text-muted-foreground">{c.sold} sold · {c.returns} ret</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel p-6 shadow-sm rounded-2xl bg-card border-border/50">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-lg font-bold">Today's Entries</h2>
          <Link to="/log" className="text-xs font-semibold text-accent hover:underline">
            View Daily Log →
          </Link>
        </div>
        <TxnTable rows={todayRows} showDate={false} />
      </section>
    </AppShell>
  );
}
