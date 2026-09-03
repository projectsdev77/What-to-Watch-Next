import { describe, expect, it } from "vitest";
import { safeRedirectTarget } from "./redirect";

function formDataWith(redirectTo?: string): FormData {
  const fd = new FormData();
  if (redirectTo !== undefined) fd.set("redirectTo", redirectTo);
  return fd;
}

describe("safeRedirectTarget", () => {
  it("accepts a real local path", () => {
    expect(safeRedirectTarget(formDataWith("/title/42"))).toBe("/title/42");
    expect(safeRedirectTarget(formDataWith("/"))).toBe("/");
    expect(safeRedirectTarget(formDataWith("/browse?platform=Netflix"))).toBe("/browse?platform=Netflix");
  });

  it("defaults to / when redirectTo is missing", () => {
    expect(safeRedirectTarget(formDataWith())).toBe("/");
  });

  it("rejects a protocol-relative URL (open redirect via //)", () => {
    expect(safeRedirectTarget(formDataWith("//evil.com"))).toBe("/");
    expect(safeRedirectTarget(formDataWith("//evil.com/phish"))).toBe("/");
  });

  it("rejects an absolute URL to another host", () => {
    expect(safeRedirectTarget(formDataWith("https://evil.com"))).toBe("/");
    expect(safeRedirectTarget(formDataWith("http://evil.com/login"))).toBe("/");
  });

  it("rejects a path with no leading slash", () => {
    expect(safeRedirectTarget(formDataWith("evil.com"))).toBe("/");
    expect(safeRedirectTarget(formDataWith("javascript:alert(1)"))).toBe("/");
  });
});
