import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { readState } from "./services/storage/localStorageAdapter";

const cloudbaseMocks = vi.hoisted(() => ({
  createCloudBaseClient: vi.fn(),
  readCloudBaseConfig: vi.fn()
}));

vi.mock("./services/cloudbase/cloudbaseClient", () => ({
  createCloudBaseClient: cloudbaseMocks.createCloudBaseClient,
  readCloudBaseConfig: cloudbaseMocks.readCloudBaseConfig
}));

describe("App", () => {
  beforeEach(() => {
    cloudbaseMocks.createCloudBaseClient.mockReset();
    cloudbaseMocks.readCloudBaseConfig.mockReset();
    cloudbaseMocks.readCloudBaseConfig.mockImplementation(() => {
      throw new Error("VITE_CLOUDBASE_ENV_ID is required");
    });
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setNumberField = (label: string, value: string) => {
    const input = screen.getByLabelText(label);

    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  const openView = (label: string) => {
    fireEvent.click(screen.getByRole("link", { name: label }));
  };

  const arrangeConfiguredCloudBase = () => {
    cloudbaseMocks.readCloudBaseConfig.mockReturnValue({
      accessKey: "publishable-test-key",
      envId: "test-env",
      region: "ap-shanghai"
    });
    cloudbaseMocks.createCloudBaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn(async () => ({ data: { user: null }, error: null })),
        onAuthStateChange: vi.fn(() => () => undefined),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn()
      },
      rdb: vi.fn(() => ({
        from: vi.fn()
      }))
    });
  };

  it("composes the shell with navigation, summary values, and the overview page", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
    expect(screen.getByText(/Local mode . cloud-ready schema/)).toBeVisible();
    expect(screen.getByText("Guest")).toBeVisible();
    expect(screen.getByText("Local guest")).toBeVisible();
    expect(screen.getByTestId("dashboard-navigation")).toBeVisible();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByText("Target band")).toBeVisible();
    expect(screen.getByText("7")).toHaveClass("font-mono");
    expect(within(screen.getByTestId("summary-header")).getByText("0%")).toHaveClass("font-mono");
    expect(within(screen.getByTestId("summary-header")).getByText("0 days")).toHaveClass(
      "font-mono"
    );
    expect(within(screen.getByTestId("summary-header")).getByText("0 XP")).toHaveClass(
      "font-mono"
    );
    expect(within(screen.getByTestId("summary-header")).getByText("Level 1")).toHaveClass(
      "font-mono"
    );
    expect(screen.getByTestId("page-overview")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeVisible();
    expect(screen.queryByTestId("daily-checkin")).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toBeVisible();
  });

  it("shows CloudBase and sync status in settings while CloudBase is unconfigured", () => {
    render(<App />);

    openView("Settings");

    expect(screen.getByText("CloudBase mode")).toBeVisible();
    expect(screen.getByText("Sync status")).toBeVisible();
    expect(screen.getAllByText("Local guest").length).toBeGreaterThan(0);
    expect(screen.getByText("Study data key: ielts-dashboard-state")).toBeVisible();
  });

  it("renders localized offline sync status in Chinese when CloudBase is configured", () => {
    localStorage.setItem("ielts-dashboard-language", "zh");
    arrangeConfiguredCloudBase();

    render(<App />);

    expect(screen.getByText("离线更改")).toBeVisible();
    expect(screen.queryByText("Local changes are saved on this device.")).not.toBeInTheDocument();
  });

  it("shows active CloudBase status copy in settings when CloudBase is configured", () => {
    arrangeConfiguredCloudBase();
    render(<App />);

    openView("Settings");

    expect(screen.getByText("CloudBase configured. Local-first sync is enabled.")).toBeVisible();
    expect(screen.queryByText("Cloud sync is planned, not active.")).not.toBeInTheDocument();
  });

  it("switches visible dashboard copy between Chinese and English and persists the choice", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    expect(screen.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "中" }));

    expect(screen.getByRole("heading", { name: "雅思备考打卡看板" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "总览" })).toBeVisible();
    expect(screen.getByRole("link", { name: "打卡" })).toBeVisible();
    expect(document.documentElement).toHaveAttribute("lang", "zh-CN");

    unmount();
    render(<App />);

    expect(screen.getByRole("heading", { name: "雅思备考打卡看板" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Eng" }));

    expect(screen.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
    expect(document.documentElement).toHaveAttribute("lang", "en");
  });

  it("updates today's check-in values until All Clear appears", () => {
    render(<App />);

    openView("Settings");
    for (const label of [
      "Listening minutes",
      "Speaking minutes",
      "Reading minutes",
      "Writing minutes"
    ]) {
      setNumberField(label, "0");
    }

    openView("Check-in");
    setNumberField("Words actual", "100");
    setNumberField("Speaking topics actual", "3");
    setNumberField("Listening tests actual", "1");
    setNumberField("Corpus minutes actual", "30");

    expect(screen.queryByText("Study time targets pending")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("daily-checkin")).getByText("All Clear")).toBeVisible();
    expect(screen.getByText("120 XP")).toHaveClass("font-mono");

    openView("Rewards");

    expect(
      within(screen.getByTestId("rewards-panel")).getByTestId("achievement-all-clear")
    ).not.toHaveAttribute("aria-disabled");
    expect(within(screen.getByTestId("rewards-panel")).getByText("20/100 XP")).toBeVisible();
  });

  it("records manual external time into today's section-minute progress", async () => {
    const user = userEvent.setup();

    render(<App />);

    openView("Check-in");
    expect(screen.getByText("Listening 0/45 min")).toBeVisible();

    openView("Timer");
    const manualForm = screen.getByTestId("manual-external-time-form");
    await user.selectOptions(within(manualForm).getByLabelText("Manual section"), "listening");
    await user.clear(within(manualForm).getByLabelText("Manual minutes"));
    await user.type(within(manualForm).getByLabelText("Manual minutes"), "45");
    await user.click(within(manualForm).getByRole("button", { name: /record external time/i }));

    openView("Check-in");
    expect(screen.queryByText("Listening 0/45 min")).not.toBeInTheDocument();
    expect(screen.getByText("Speaking 0/30 min")).toBeVisible();
  });

  it("persists the full desktop target, check-in, manual time, and heatmap flow after refresh", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    openView("Settings");
    setNumberField("Total band", "7.0");
    setNumberField("Words", "120");

    openView("Check-in");
    setNumberField("Words actual", "120");

    openView("Timer");
    const manualForm = screen.getByTestId("manual-external-time-form");
    await user.selectOptions(within(manualForm).getByLabelText("Manual section"), "reading");
    await user.clear(within(manualForm).getByLabelText("Manual minutes"));
    await user.type(within(manualForm).getByLabelText("Manual minutes"), "30");
    await user.click(within(manualForm).getByRole("button", { name: /record external time/i }));

    unmount();
    render(<App />);

    openView("Settings");
    expect(screen.getByLabelText("Total band")).toHaveDisplayValue("7.0");
    expect(screen.getByLabelText("Words")).toHaveDisplayValue("120");

    openView("Check-in");
    expect(screen.getByLabelText("Words actual")).toHaveDisplayValue("120");
    expect(screen.getByText("Reading 30/60 min")).toBeVisible();

    openView("Progress");
    expect(
      within(screen.getByTestId("history-heatmap")).getByRole("button", {
        name: /19% complete/
      })
    ).toHaveAttribute("data-level", "1");
  });

  it("updates today's heatmap cell after check-in progress", () => {
    render(<App />);

    openView("Check-in");
    setNumberField("Words actual", "100");
    openView("Progress");

    const heatmap = screen.getByTestId("history-heatmap");

    expect(within(heatmap).getByRole("button", { name: /13% complete/ })).toHaveAttribute(
      "data-level",
      "1"
    );
  });

  it("records first post-midnight check-in and timer activity on the new local date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 22, 23, 59, 50));
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(11_000);
    });

    openView("Timer");
    const manualForm = screen.getByTestId("manual-external-time-form");
    fireEvent.change(within(manualForm).getByLabelText("Manual section"), {
      target: { value: "listening" }
    });
    fireEvent.change(within(manualForm).getByLabelText("Manual minutes"), {
      target: { value: "15" }
    });
    fireEvent.click(within(manualForm).getByRole("button", { name: /record external time/i }));

    openView("Check-in");
    setNumberField("Words actual", "100");

    const persistedState = readState();
    expect(persistedState?.timerSessions).toEqual([
      expect.objectContaining({
        date: "2026-07-23",
        section: "listening",
        actualMinutes: 15
      })
    ]);
    expect(persistedState?.records).toEqual([
      expect.objectContaining({
        date: "2026-07-23",
        words: 100,
        sectionMinutes: expect.objectContaining({ listening: 15 })
      })
    ]);
  });
});
