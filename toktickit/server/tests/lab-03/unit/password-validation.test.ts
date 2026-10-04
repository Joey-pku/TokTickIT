/**
 * server/tests/lab-03/unit/password-validation.test.ts
 *
 * UNIT-PWD-01 through UNIT-PWD-06
 * Tests the validatePasswordComplexity function from auth.ts
 */
import { describe, expect, it } from "vitest";
import { validatePasswordComplexity } from "../../../src/auth.js";

describe("validatePasswordComplexity", () => {
  // UNIT-PWD-01: Valid passwords
  it("UNIT-PWD-01: accepts valid passwords meeting all criteria", () => {
    expect(validatePasswordComplexity("Passw0rd!")).toBe(true);
    expect(validatePasswordComplexity("MyPass99@")).toBe(true);
    expect(validatePasswordComplexity("C0mplex#Pass")).toBe(true);
    expect(validatePasswordComplexity("Aa1!aaaa")).toBe(true); // exactly 8 code points
  });

  // UNIT-PWD-02: Too short (< 8 code points)
  it("UNIT-PWD-02: rejects passwords shorter than 8 code points", () => {
    expect(validatePasswordComplexity("Ab1!")).toBe(false);
    expect(validatePasswordComplexity("Ab1!abc")).toBe(false); // 7 chars
    expect(validatePasswordComplexity("")).toBe(false);
  });

  // UNIT-PWD-03: Missing uppercase
  it("UNIT-PWD-03: rejects passwords without an uppercase letter", () => {
    expect(validatePasswordComplexity("allower1!")).toBe(false);
    expect(validatePasswordComplexity("password1!")).toBe(false);
  });

  // UNIT-PWD-04: Missing lowercase
  it("UNIT-PWD-04: rejects passwords without a lowercase letter", () => {
    expect(validatePasswordComplexity("ALLCAPS1!")).toBe(false);
    expect(validatePasswordComplexity("PASSWORD1!")).toBe(false);
  });

  // UNIT-PWD-05: Missing digit
  it("UNIT-PWD-05: rejects passwords without a digit", () => {
    expect(validatePasswordComplexity("NoDigit!!")).toBe(false);
    expect(validatePasswordComplexity("UpperLower!")).toBe(false);
  });

  // UNIT-PWD-06: Missing symbol
  it("UNIT-PWD-06: rejects passwords without a symbol", () => {
    expect(validatePasswordComplexity("Password1")).toBe(false);
    expect(validatePasswordComplexity("MyPass123")).toBe(false);
  });

  // UNIT-PWD-07: 72-byte UTF-8 boundary
  it("UNIT-PWD-07: accepts exactly 72 bytes (all ASCII)", () => {
    // 68 lowercase + Aa1! = 72 bytes, 72 code points
    const p = "a".repeat(68) + "Aa1!";
    expect(Buffer.byteLength(p, "utf8")).toBe(72);
    expect(validatePasswordComplexity(p)).toBe(true);
  });

  it("UNIT-PWD-07b: rejects passwords exceeding 72 bytes", () => {
    // 69 lowercase + Aa1! = 73 bytes
    const p = "a".repeat(69) + "Aa1!";
    expect(Buffer.byteLength(p, "utf8")).toBe(73);
    expect(validatePasswordComplexity(p)).toBe(false);
  });

  it("UNIT-PWD-08: counts code points not bytes for minimum (emoji = 1 code point, >1 byte)", () => {
    // 7 ASCII chars + 1 emoji = 8 code points but 11 bytes
    // Should pass the minimum 8 code-point check if complexity criteria are met
    const p = "Aa1!aaa\u{1F600}"; // 8 code points (emoji is 4 bytes)
    expect(Array.from(p).length).toBe(8);
    expect(validatePasswordComplexity(p)).toBe(true);
  });

  it("UNIT-PWD-09: whitespace-only passwords without trimming are rejected (too short or no symbol)", () => {
    // Fields are NOT trimmed per contract
    expect(validatePasswordComplexity("        ")).toBe(false); // 8 spaces, no case/digit/symbol
  });
});
