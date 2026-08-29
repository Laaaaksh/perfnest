import { safeEqual } from "./compare";

export { SESSION_COOKIE, createSessionToken, verifySessionToken } from "./session-token";

/**
 * Perfnest is single-admin, self-hosted software: there is no user table,
 * just one operator-set password compared in constant time so response
 * timing can't leak how many characters matched. Uses `node:crypto`, so it
 * must never be imported from `middleware.ts` (Edge runtime) - only from
 * server actions and route handlers.
 */
export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not set (see .env.example).");
  }
  return safeEqual(candidate, expected);
}
