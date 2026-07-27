import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "../../test/renderWithI18n";
import { AuthPanel, type AuthPanelProps } from "./AuthPanel";

const createProps = (overrides: Partial<AuthPanelProps> = {}): AuthPanelProps => ({
  accountName: null,
  errorMessage: null,
  onCompleteEmailSignUp: vi.fn().mockResolvedValue(undefined),
  onSignIn: vi.fn().mockResolvedValue(undefined),
  onSignOut: vi.fn().mockResolvedValue(undefined),
  onStartEmailSignUp: vi.fn().mockResolvedValue(undefined),
  pendingSignUpEmail: null,
  status: "guest",
  ...overrides
});

const renderAuthPanel = (overrides: Partial<AuthPanelProps> = {}) => {
  const props = createProps(overrides);
  const view = renderWithI18n(<AuthPanel {...props} />);

  return { props, user: userEvent.setup(), view };
};

describe("AuthPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders sign-in fields and switches to sign-up fields", async () => {
    const { user } = renderAuthPanel();

    expect(screen.getByLabelText("Account")).toBeVisible();
    expect(screen.getByLabelText("Password")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Username")).toBeVisible();
    expect(screen.getByLabelText("Password")).toBeVisible();
    expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
  });

  it("rejects invalid sign-in credentials before submit", async () => {
    const { props, user } = renderAuthPanel();

    await user.type(screen.getByLabelText("Account"), "bad");
    await user.type(screen.getByLabelText("Password"), "short1");
    await user.click(
      within(screen.getByRole("form", { name: "Sign in" })).getByRole("button", {
        name: "Sign in"
      })
    );

    expect(props.onSignIn).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Use a valid email or a 6-25 lowercase username that starts with a letter and uses only numbers, underscores, or hyphens after that."
      )
    ).toBeVisible();
    expect(screen.getByText("Password must be 8-32 characters and include letters and numbers.")).toBeVisible();
  });

  it("calls sign in with an email or username account", async () => {
    const { props, user } = renderAuthPanel();

    await user.type(screen.getByLabelText("Account"), "weihao_02");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(
      within(screen.getByRole("form", { name: "Sign in" })).getByRole("button", {
        name: "Sign in"
      })
    );

    expect(props.onSignIn).toHaveBeenCalledWith({
      account: "weihao_02",
      password: "Password123"
    });
  });

  it("lowercases username sign-in accounts before submit", async () => {
    const { props, user } = renderAuthPanel();

    await user.type(screen.getByLabelText("Account"), "Jonathon");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(
      within(screen.getByRole("form", { name: "Sign in" })).getByRole("button", {
        name: "Sign in"
      })
    );

    expect(props.onSignIn).toHaveBeenCalledWith({
      account: "jonathon",
      password: "Password123"
    });
  });

  it("shows localized Chinese auth failure copy instead of a raw service message", async () => {
    localStorage.setItem("ielts-dashboard-language", "zh");
    const rawMessage = "Invalid login credentials.";
    const { user } = renderAuthPanel({
      onSignIn: vi.fn().mockRejectedValue(new Error(rawMessage))
    });

    await user.type(screen.getByLabelText("账号"), "weihao_02");
    await user.type(screen.getByLabelText("密码"), "Password123");
    await user.click(
      within(screen.getByRole("form", { name: "登录" })).getByRole("button", {
        name: "登录"
      })
    );

    expect(await screen.findByText("认证失败。")).toBeVisible();
    expect(screen.queryByText(rawMessage)).not.toBeInTheDocument();
  });

  it("rejects invalid sign-up fields before requesting a code", async () => {
    const { props, user } = renderAuthPanel();

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "bad-email");
    await user.type(screen.getByLabelText("Username"), "12345");
    await user.type(screen.getByLabelText("Password"), "short1");
    await user.click(screen.getByRole("button", { name: "Send verification code" }));

    expect(props.onStartEmailSignUp).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    expect(
      screen.getByText(
        "Username is optional. If filled, use 6-25 lowercase characters, start with a letter, and use only numbers, underscores, or hyphens after that."
      )
    ).toBeVisible();
    expect(screen.getByText("Password must be 8-32 characters and include letters and numbers.")).toBeVisible();
  });

  it("calls start sign up with email, optional username, and password", async () => {
    const { props, user } = renderAuthPanel();

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "weihao@example.com");
    await user.type(screen.getByLabelText("Username"), "weihao_01");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Send verification code" }));

    expect(props.onStartEmailSignUp).toHaveBeenCalledWith({
      email: "weihao@example.com",
      password: "Password123",
      username: "weihao_01"
    });
  });

  it("lowercases sign-up username while typing and before submit", async () => {
    const { props, user } = renderAuthPanel();

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "weihao@example.com");
    const usernameInput = screen.getByLabelText("Username");
    await user.type(usernameInput, "Jonathon");
    await user.type(screen.getByLabelText("Password"), "Password123");

    expect(usernameInput).toHaveValue("jonathon");

    await user.click(screen.getByRole("button", { name: "Send verification code" }));

    expect(props.onStartEmailSignUp).toHaveBeenCalledWith({
      email: "weihao@example.com",
      password: "Password123",
      username: "jonathon"
    });
  });

  it("rejects invalid verification codes before completing sign up", async () => {
    const { props, user } = renderAuthPanel({
      pendingSignUpEmail: "weihao@example.com"
    });

    const panel = screen.getByTestId("auth-panel");
    expect(within(panel).getByText("weihao@example.com")).toBeVisible();
    await user.type(screen.getByLabelText("Verification code"), "12345a");
    await user.click(screen.getByRole("button", { name: "Complete sign up" }));

    expect(props.onCompleteEmailSignUp).not.toHaveBeenCalled();
    expect(screen.getByText("Enter the 6-digit verification code.")).toBeVisible();
  });

  it("calls complete sign up with a valid verification code", async () => {
    const { props, user } = renderAuthPanel({
      pendingSignUpEmail: "weihao@example.com"
    });

    await user.type(screen.getByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Complete sign up" }));

    expect(props.onCompleteEmailSignUp).toHaveBeenCalledWith("123456");
  });

  it("shows signed-in account details and signs out", async () => {
    const { props, user } = renderAuthPanel({
      accountName: "weihao_01",
      status: "authenticated"
    });

    expect(screen.getByText("Signed in as weihao_01")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(props.onSignOut).toHaveBeenCalledOnce();
  });
});
