import { describe, expect, it } from "vitest";
import { normalizePrivateKey } from "../server/firebase-admin";

const PEM = "-----BEGIN PRIVATE KEY-----\nABC==\n-----END PRIVATE KEY-----\n";
const ESCAPED = "-----BEGIN PRIVATE KEY-----\\nABC==\\n-----END PRIVATE KEY-----\\n";

describe("normalizePrivateKey", () => {
  it("accepts the key as stored in the JSON file (literal \\n)", () => {
    expect(normalizePrivateKey(ESCAPED)).toBe(PEM);
  });
  it("strips surrounding quotes pasted from .env", () => {
    expect(normalizePrivateKey(`"${ESCAPED}"`)).toBe(PEM);
    expect(normalizePrivateKey(`  '${ESCAPED}'\n`)).toBe(PEM);
  });
  it("keeps a key that already has real newlines", () => {
    expect(normalizePrivateKey(PEM)).toBe(PEM.trim());
  });
  it("returns undefined when empty", () => {
    expect(normalizePrivateKey(undefined)).toBeUndefined();
    expect(normalizePrivateKey("")).toBeUndefined();
  });
});
