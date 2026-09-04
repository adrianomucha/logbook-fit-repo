import { describe, it, expect } from "vitest";
import { ADMIN_TABS, DEFAULT_ADMIN_TAB, adminTabHref, isAdminTab } from "../tabs";

describe("admin tabs", () => {
  it("recognises every declared tab and nothing else", () => {
    for (const { key } of ADMIN_TABS) expect(isAdminTab(key)).toBe(true);
    expect(isAdminTab("users")).toBe(false); // legacy route name, not a tab
    expect(isAdminTab(null)).toBe(false);
    expect(isAdminTab(undefined)).toBe(false);
    expect(isAdminTab("")).toBe(false);
  });

  it("keeps the default tab's URL bare and puts every other tab in ?tab=", () => {
    expect(adminTabHref(DEFAULT_ADMIN_TAB)).toBe("/admin");
    expect(adminTabHref("health")).toBe("/admin?tab=health");
  });

  it("has unique keys", () => {
    const keys = ADMIN_TABS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
