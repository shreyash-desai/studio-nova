import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getPublicOperators, unlockSite } from "@/lib/api.functions";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Unlock · Studio Nova" },
      { name: "description", content: "Enter the studio passcode to open the daily log manager." },
    ],
  }),
  loader: async () => getPublicOperators(),
  component: Unlock,
});

function Unlock() {
  const { operators } = Route.useLoaderData();
  const unlock = useServerFn(unlockSite);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [operatorId, setOperatorId] = useState(operators[0]?.id || "");

  // Never let the browser submit this form natively (it would put the passcode
  // in the URL); only enable it once React has hydrated.
  useEffect(() => setReady(true), []);

  const op = operators.find((o) => o.id === operatorId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!op) return;
    
    setBusy(true);
    setError(false);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const { ok } = await unlock({ 
      data: { 
        password, 
        operatorId: op.id, 
        operatorName: op.name, 
        operatorRole: op.role 
      } 
    });
    setBusy(false);
    if (ok) {
      window.location.href = "/";
      return;
    }
    setError(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center sm:text-left">
          <img src="/logo/logo.png" alt="Studio Nova" className="mt-5 h-12 w-auto object-contain mix-blend-multiply sm:mx-0 mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            Daily log manager for stock, production and sales.
          </p>
        </div>

        <form onSubmit={onSubmit} className="panel p-6 space-y-4">
          <div>
            <label htmlFor="operatorId" className="label-plain">Select Name</label>
            <select
              id="operatorId"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="field mt-2 focus:field-focus"
            >
              {operators.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          
          {op && (
            <div>
              <label htmlFor="role" className="label-plain">Role</label>
              <input
                id="role"
                type="text"
                value={op.role.charAt(0).toUpperCase() + op.role.slice(1)}
                disabled
                className="field mt-2 font-semibold disabled:opacity-70 disabled:bg-secondary disabled:cursor-not-allowed"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="label-plain">
              Passcode
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              className="field mt-2 focus:field-focus"
              placeholder="••••"
            />
            {error ? (
              <p className="mt-2 text-xs font-semibold text-destructive">Incorrect passcode.</p>
            ) : null}
          </div>
          
          <button
            type="submit"
            disabled={busy || !ready || !op}
            className="mt-6 w-full rounded-full bg-foreground px-4 py-3 text-sm font-bold text-background shadow transition-all hover:opacity-90 disabled:opacity-50"
          >
            {!ready ? "Loading…" : busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
