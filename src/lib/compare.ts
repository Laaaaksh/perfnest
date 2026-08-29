import { timingSafeEqual } from "node:crypto";

/** Constant-time string comparison, safe for secrets (passwords, API tokens). */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare fixed-size buffers anyway so the length-mismatch branch
    // doesn't return measurably faster than the equal-length path.
    timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
