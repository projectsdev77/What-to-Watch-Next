import { describe, expect, it } from "vitest";
import { getPasswordRequirements, passwordError, PASSWORD_MIN_LENGTH } from "./password";

describe("passwordError", () => {
  it("rejects a password shorter than the minimum", () => {
    expect(passwordError("Ab1")).toBe(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  });

  it("rejects a password missing a lowercase letter", () => {
    expect(passwordError("ABCDEFG1")).toBe("Password must include a lowercase letter.");
  });

  it("rejects a password missing an uppercase letter", () => {
    expect(passwordError("abcdefg1")).toBe("Password must include an uppercase letter.");
  });

  it("rejects a password missing a number", () => {
    expect(passwordError("Abcdefgh")).toBe("Password must include a number.");
  });

  it("accepts a password satisfying every rule", () => {
    expect(passwordError("Abcdefg1")).toBeNull();
  });

  it("checks length before character classes", () => {
    // A too-short password should report the length issue even if it's
    // also missing other requirements — first-failure order matters for
    // the message shown to the user.
    expect(passwordError("a")).toBe(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  });
});

describe("getPasswordRequirements", () => {
  it("reports every requirement as unmet for an empty password", () => {
    const requirements = getPasswordRequirements("");
    expect(requirements.every((r) => r.met === false)).toBe(true);
    expect(requirements).toHaveLength(4);
  });

  it("reports every requirement as met for a valid password", () => {
    const requirements = getPasswordRequirements("Abcdefg1");
    expect(requirements.every((r) => r.met === true)).toBe(true);
  });

  it("marks only the satisfied requirements as met, independently of each other", () => {
    // Long enough and has a number, but no letters at all.
    const requirements = getPasswordRequirements("12345678");
    const byLabel = Object.fromEntries(requirements.map((r) => [r.label, r.met]));
    expect(byLabel["At least 8 characters"]).toBe(true);
    expect(byLabel["One number"]).toBe(true);
    expect(byLabel["One lowercase letter"]).toBe(false);
    expect(byLabel["One uppercase letter"]).toBe(false);
  });
});
