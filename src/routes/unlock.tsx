import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { unlockSite } from "@/lib/api.functions";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Unlock · Studio Ledger" },
      { name: "description", content: "Enter the studio passcode to open the daily log manager." },
      { property: "og:title", content: "Unlock · Studio Ledger" },
      { property: "og:description", content: "Passcode-protected daily log manager for the studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Unlock,
});

function Unlock() {
  const unlock = useServerFn(unlockSite);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const { ok } = await unlock({ data: { password } });
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
        <div className="mb-8">
          <div className="flex gap-1">
            <span className="h-1.5 w-8 rounded-full bg-received" />
            <span className="h-1.5 w-8 rounded-full bg-used" />
            <span className="h-1.5 w-8 rounded-full bg-printed" />
            <span className="h-1.5 w-8 rounded-full bg-sold" />
            <span className="h-1.5 w-8 rounded-full bg-return" />
          </div>
          <h1 className="mt-5 font-display text-4xl font-extrabold">Studio Ledger</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Daily log manager for stock, production and sales.
          </p>
        </div>

        <form onSubmit={onSubmit} className="panel p-5">
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
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
