import { beforeEach, describe, expect, it } from "vitest";
import { checkAdminPassword, createSessionToken, verifySessionToken } from "./auth";

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";
  process.env.AUTH_SECRET = "a-test-secret-that-is-long-enough";
});

describe("checkAdminPassword", () => {
  it("accepts the configured password", () => {
    expect(checkAdminPassword("correct-horse-battery-staple")).toBe(true);
  });

  it("rejects an incorrect password", () => {
    expect(checkAdminPassword("wrong-password")).toBe(false);
  });

  it("throws a clear error when ADMIN_PASSWORD is unset", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(() => checkAdminPassword("anything")).toThrow(/ADMIN_PASSWORD/);
  });
});

describe("session tokens", () => {
  it("round-trips: a freshly created token verifies as admin", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it("rejects a garbage token", async () => {
    expect(await verifySessionToken("not-a-real-jwt")).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken();
    process.env.AUTH_SECRET = "a-completely-different-secret-value";
    expect(await verifySessionToken(token)).toBe(false);
  });

  it("throws when AUTH_SECRET is unset", async () => {
    delete process.env.AUTH_SECRET;
    await expect(createSessionToken()).rejects.toThrow(/AUTH_SECRET/);
  });
});
