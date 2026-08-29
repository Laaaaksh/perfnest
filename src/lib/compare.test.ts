import { describe, expect, it } from "vitest";
import { safeEqual } from "./compare";

describe("safeEqual", () => {
  it("returns true for identical strings", () => {
    expect(safeEqual("correct-token", "correct-token")).toBe(true);
  });

  it("returns false for different strings of equal length", () => {
    expect(safeEqual("correct-token", "wrong-tokenn")).toBe(false);
  });

  it("returns false for strings of different length instead of throwing", () => {
    expect(safeEqual("short", "a-much-longer-string")).toBe(false);
  });

  it("returns false when comparing against an empty string", () => {
    expect(safeEqual("", "non-empty")).toBe(false);
  });

  it("returns true for two empty strings", () => {
    expect(safeEqual("", "")).toBe(true);
  });
});
