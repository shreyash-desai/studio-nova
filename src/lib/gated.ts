import { redirect } from "@tanstack/react-router";

export const LOCKED = "SITE_LOCKED";

function isLocked(error: unknown): boolean {
  return error instanceof Error && error.message.includes(LOCKED);
}

/**
 * Server functions throw a plain LOCKED error when the passcode session is
 * missing. Route loaders turn that into a real router redirect (throwing a
 * redirect Response from inside a server function surfaces on the client as
 * an opaque "[object Response]" runtime error and blanks the page).
 */
export async function gatedLoad<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isLocked(error)) throw redirect({ to: "/unlock" });
    throw error;
  }
}
