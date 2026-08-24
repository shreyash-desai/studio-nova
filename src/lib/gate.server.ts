import { useSession } from "@tanstack/react-start/server";
import { LOCKED } from "./gated";
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "studio-ledger-gate",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: true,
      // The Lovable preview runs the app inside a cross-site iframe. `lax`
      // cookies are dropped there, so the successful unlock disappeared as
      // soon as the browser loaded the dashboard.
      sameSite: "none" as const,
      partitioned: true,
      path: "/",
    },
  };
}

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig());
}

export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function requireUnlocked() {
  const session = await getGateSession();
  if (!session.data.unlocked) throw new Error(LOCKED);
  return session;
}

export async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
