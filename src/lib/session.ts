import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./session-token";

export async function isAdminSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}
