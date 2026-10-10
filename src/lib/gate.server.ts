import { useSession } from "@tanstack/react-start/server";
import { LOCKED } from "./gated";
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean; operatorId?: string; operatorName?: string; operatorRole?: string };

function sessionConfig() {
  const secret = process.env["SESSION_SECRET"]?.trim() || "";
  if (secret.length < 32) {
    throw new Error("Server configuration error: SESSION_SECRET is missing or insufficiently strong.");
  }
  return {
    password: secret,
    name: "studio-ledger-gate",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
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
