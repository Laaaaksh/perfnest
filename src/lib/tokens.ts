import { randomBytes } from "node:crypto";

export function generateApiToken(): string {
  return `pfn_${randomBytes(24).toString("base64url")}`;
}

export function generatePublicSlug(): string {
  return randomBytes(6).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}
