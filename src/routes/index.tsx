import { gatedLoad } from "@/lib/gated";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getDashboard } from "@/lib/api.functions";
import { AppShell } from "@/components/AppShell";
import { Stat, TxnTable } from "@/components/ledger-ui";
import { fmtDayLong, fmtMoney, fmtQty, todayISO, isCustom3D, type TxnRow } from "@/lib/txn";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · Studio Nova" },
      { name: "description", content: "Analytics, daily and monthly production and sales overview." },
    ],
  }),
  loader: () => {
    const today = todayISO();
    return gatedLoad(getDashboard({ data: { today, year: today.slice(0, 4) } }));
  },
  errorComponent: ({ error }) => <ErrorBox message={(error as any)?.message || String(error)} />,
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
  const [graphView, setGraphView] = useState<"daily" | "monthly">("daily");

  const currentMonth = today.slice(0, 7); // e.g. "2026-11"
  const todayRows = rows.filter((r) => r.occurred_on === today);
  const thisMonthRows = rows.filter((r) => r.occurred_on.startsWith(currentMonth));

  // Client Mandate: Custom 3D parts must NOT be included in total sales
  const isStandardSale = (r: TxnRow) => r.type === "sold" && !isCustom3D(r);

  const sumQty = (list: TxnRow[], filterFn: (r: TxnRow) => boolean) =>
    list.filter(filterFn).reduce((a, r) => a + Number(r.qty), 0);

  // Daily (Today) Metrics
  const todayProduction = sumQty(todayRows, (r) => r.type === "printed");
  const todaySales = sumQty(todayRows, isStandardSale);
  const todayCustom3D = sumQty(todayRows, (r) => r.type === "sold" && isCustom3D(r));

  // Current Month Metrics
  const monthProduction = sumQty(thisMonthRows, (r) => r.type === "printed");
  const monthSales = sumQty(thisMonthRows, isStandardSale);
  const monthReturns = sumQty(thisMonthRows, (r) => r.type === "return");
  const monthMaterialUsed = thisMonthRows
    .filter((r) => r.type === "used")
    .reduce((a, r) => {
      const q = Number(r.qty);
      if (r.unit === "g") return a + q / 1000;
      return a + q;
    }, 0);

  // Global YTD Stats (excluding Custom 3D in total sales)
  const totalSales = sumQty(rows, isStandardSale);
  const totalCustom3D = sumQty(rows, (r) => r.type === "sold" && isCustom3D(r));
  const totalReturns = sumQty(rows, (r) => r.type === "return");
  const totalProduction = sumQty(rows, (r) => r.type === "printed");
  const materialUsed = rows
    .filter((r) => r.type === "used")
    .reduce((a, r) => {
      const q = Number(r.qty);
      if (r.unit === "g") return a + q / 1000;
      return a + q;
    }, 0);

  // Channel Net Sales (excluding Custom 3D)
  const channelData = useMemo(() => {
    const channels = ["Amazon", "Claymango", "Pepperfry", "Flipkart", "Website", "B2B", "Others"];
    const map = new Map<string, { sold: number; returns: number }>();
    channels.forEach((c) => map.set(c.toLowerCase(), { sold: 0, returns: 0 }));

    rows.forEach((r) => {
      const cName = r.channel?.name?.toLowerCase();
      if (!cName) return;
      if (!map.has(cName)) map.set(cName, { sold: 0, returns: 0 });
      const stats = map.get(cName)!;
      if (isStandardSale(r)) stats.sold += Number(r.qty);
      if (r.type === "return") stats.returns += Number(r.qty);
    });

    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        net: stats.sold - stats.returns,
        sold: stats.sold,
        returns: stats.returns,
      }))
      .filter((c) => c.sold > 0 || c.returns > 0)
      .sort((a, b) => b.net - a.net);
  }, [rows]);

  // Monthly Graph Data (Excludes Custom 3D from Sales)
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = months.map((m) => ({
      name: m,
      Sales: 0,
      Production: 0,
      Returns: 0,
    }));

    rows.forEach((r) => {
      const monthIndex = Number(r.occurred_on.slice(5, 7)) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        if (isStandardSale(r)) data[monthIndex]!.Sales += Number(r.qty);
        if (r.type === "printed") data[monthIndex]!.Production += Number(r.qty);
        if (r.type === "return") data[monthIndex]!.Returns += Number(r.qty);
      }
    });
    return data;
  }, [rows]);

  // Daily Graph Data (Day-by-Day for Current Month)
  const dailyData = useMemo(() => {
    const [yStr, mStr] = currentMonth.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const data: { name: string; Production: number; Sales: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayPad = String(day).padStart(2, "0");
      const dateStr = `${currentMonth}-${dayPad}`;
      data.push({
        name: `${dayPad}`,
        Production: 0,
        Sales: 0,
      });
    }

    thisMonthRows.forEach((r) => {
      const dayNum = Number(r.occurred_on.slice(8, 10));
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        if (isStandardSale(r)) data[dayNum - 1]!.Sales += Number(r.qty);
        if (r.type === "printed") data[dayNum - 1]!.Production += Number(r.qty);
      }
    });
    return data;
  }, [thisMonthRows, currentMonth]);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentMonthLabel = monthNames[Number(currentMonth.slice(5, 7)) - 1];

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
      {/* 1. Daily & Current Monthly Live Pacing */}
      <div className="mb-8 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Today & Current Month ({currentMonthLabel})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Today's Production"
              value={fmtQty(todayProduction)}
              accent="bg-blue-500"
              hint="Units printed today"
            />
            <Stat
              label="Today's Sales"
              value={fmtQty(todaySales)}
              accent="bg-green-500"
              hint={todayCustom3D > 0 ? `+${todayCustom3D} Custom 3D separate` : "Units sold today (excl. Custom 3D)"}
            />
            <Stat
              label={`${currentMonthLabel} Production`}
              value={fmtQty(monthProduction)}
              accent="bg-indigo-500"
              hint={`Printed so far in ${currentMonthLabel}`}
            />
            <Stat
              label={`${currentMonthLabel} Sales`}
              value={fmtQty(monthSales)}
              accent="bg-emerald-500"
              hint={`Sold so far in ${currentMonthLabel}`}
            />
          </div>
        </div>

        {/* 2. Global YTD Stats */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Year-to-Date Totals ({year})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Total Sales (YTD)"
              value={fmtQty(totalSales)}
              accent="bg-green-600"
              hint={totalCustom3D > 0 ? `Excludes ${totalCustom3D} Custom 3D units` : "Standard catalog products"}
            />
            <Stat
              label="Total Production (YTD)"
              value={fmtQty(totalProduction)}
              accent="bg-blue-600"
              hint="Total units printed"
            />
            <Stat
              label="Total Returns (YTD)"
              value={fmtQty(totalReturns)}
              accent="bg-red-500"
              hint="Total units returned"
            />
            <Stat
              label="Material Used (YTD)"
              value={`${fmtQty(materialUsed)} kg`}
              accent="bg-amber-500"
              hint="Filament & parts consumed"
            />
          </div>
        </div>
      </div>

      {/* 3. Interactive Graphs: Daily and Monthly */}
      <div className="grid gap-8 lg:grid-cols-3 mb-8">
        <section className="panel p-6 lg:col-span-2 shadow-sm rounded-2xl bg-card border-border/50">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold">
                {graphView === "daily" ? `Daily Production vs Sales (${currentMonthLabel})` : `Monthly Production vs Sales (${year})`}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {graphView === "daily" ? `Day-by-day factory output for ${currentMonthLabel}` : "12-month production and sales pacing"}
              </p>
            </div>
            {/* View Switcher: Daily vs Monthly */}
            <div className="inline-flex rounded-full bg-secondary p-1">
              <button
                type="button"
                onClick={() => setGraphView("daily")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  graphView === "daily"
                    ? "bg-foreground text-background shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Daily ({currentMonthLabel})
              </button>
              <button
                type="button"
                onClick={() => setGraphView("monthly")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  graphView === "monthly"
                    ? "bg-foreground text-background shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly ({year})
              </button>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={graphView === "daily" ? dailyData : monthlyData}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--card-foreground)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />
                <Bar dataKey="Production" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={graphView === "daily" ? 18 : 36} />
                <Bar dataKey="Sales" fill="var(--foreground)" radius={[4, 4, 0, 0]} maxBarSize={graphView === "daily" ? 18 : 36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Channel Breakdown */}
        <section className="panel p-6 shadow-sm rounded-2xl bg-card border-border/50">
          <h2 className="font-display text-lg font-bold mb-1">Net Sales by Channel</h2>
          <p className="text-xs text-muted-foreground mb-5">Marketplaces and B2B channels</p>
          <div className="space-y-4">
            {channelData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sales recorded yet.</p>
            ) : (
              channelData.map((c) => (
                <div key={c.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="font-semibold text-sm">{c.name}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="font-bold">{fmtQty(c.net)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.sold} sold · {c.returns} ret
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 4. Today's Activity Table */}
      <section className="panel p-6 shadow-sm rounded-2xl bg-card border-border/50">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Today's Entries</h2>
            <p className="text-xs text-muted-foreground">All movements logged for {fmtDayLong(today)}</p>
          </div>
          <Link to="/log" className="text-xs font-semibold text-accent hover:underline">
            View Daily Log →
          </Link>
        </div>
        <TxnTable rows={todayRows} showDate={false} />
      </section>
    </AppShell>
  );
}
