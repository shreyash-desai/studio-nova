import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { LOCKED } from "./gated";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean; operatorId?: string; operatorName?: string; operatorRole?: string };

const COOKIE_NAME = "studio-ledger-gate";

function getSecret() {
  const secret = process.env["SESSION_SECRET"]?.trim() || "";
  if (secret.length < 32) {
    throw new Error("Server configuration error: SESSION_SECRET is missing or insufficiently strong.");
  }
  return secret;
}

function sign(payload: string, secret: string) {
  const hmac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${hmac}`;
}

function verify(token: string, secret: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
  if (sig.length !== expectedSig.length) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (!timingSafeEqual(a, b)) return null;
  return payload;
}

export async function getGateSession() {
  const secret = getSecret();
  let sessionData: GateSession = {};
  const rawCookie = getCookie(COOKIE_NAME);
  if (rawCookie) {
    const verified = verify(rawCookie, secret);
    if (verified) {
      try {
        sessionData = JSON.parse(Buffer.from(verified, "base64url").toString("utf8"));
      } catch {
        sessionData = {};
      }
    }
  }

  return {
    data: sessionData,
    async update(patch: Partial<GateSession>) {
      sessionData = { ...sessionData, ...patch };
      const serialized = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
      const signed = sign(serialized, secret);
      setCookie(COOKIE_NAME, signed, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    },
    async clear() {
      sessionData = {};
      deleteCookie(COOKIE_NAME, { path: "/" });
    },
  };
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
