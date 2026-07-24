import { describe, expect, it } from "vitest";
import {
  DASHBOARD_VIEWS,
  hashForView,
  normalizeDashboardView,
  viewFromHash
} from "./navigation";

describe("dashboard navigation", () => {
  it("keeps the expected six dashboard views in order", () => {
    expect(DASHBOARD_VIEWS).toEqual([
      "overview",
      "checkin",
      "timer",
      "progress",
      "rewards",
      "settings"
    ]);
  });

  it("defaults unknown view values to overview", () => {
    expect(normalizeDashboardView(undefined)).toBe("overview");
    expect(normalizeDashboardView("")).toBe("overview");
    expect(normalizeDashboardView("bad-view")).toBe("overview");
  });

  it("normalizes valid view values", () => {
    expect(normalizeDashboardView("timer")).toBe("timer");
    expect(normalizeDashboardView("settings")).toBe("settings");
  });

  it("parses hash links into dashboard views", () => {
    expect(viewFromHash("#timer")).toBe("timer");
    expect(viewFromHash("#/progress")).toBe("progress");
    expect(viewFromHash("#bad")).toBe("overview");
  });

  it("builds hash links for views", () => {
    expect(hashForView("checkin")).toBe("#checkin");
  });
});
