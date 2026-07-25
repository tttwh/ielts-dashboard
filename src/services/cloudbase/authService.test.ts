import { describe, expect, it, vi } from "vitest";
import type { CloudBaseAuthClient } from "./cloudbaseTypes";
import { createAuthService, validateEmail, validatePassword, validateUsername } from "./authService";

const user = {
  uid: "u-1",
  email: "weihao@example.com",
  username: "weihao_01",
  accountName: "weihao_01"
};

const sdkUserWithId = {
  id: "cloud-user-id-1",
  email: "weihao@example.com",
  username: "weihao_01",
  accountName: "weihao_01"
};

const normalizedSdkUserWithId = {
  uid: "cloud-user-id-1",
  email: "weihao@example.com",
  username: "weihao_01",
  accountName: "weihao_01"
};

const fakeAuthClient = (overrides: Partial<CloudBaseAuthClient> = {}): CloudBaseAuthClient => ({
  signUp: vi.fn(async () => ({
    data: {
      messageId: "message-1",
      verifyOtp: vi.fn(async () => ({ data: { user, session: {} }, error: null }))
    },
    error: null
  })),
  signInWithPassword: vi.fn(async () => ({
    data: { user, session: {} },
    error: null
  })),
  signOut: vi.fn(async () => ({ data: {}, error: null })),
  getSession: vi.fn(async () => ({ data: { user: null }, error: null })),
  onAuthStateChange: vi.fn(() => () => undefined),
  ...overrides
});

describe("auth validation", () => {
  it("validates registration email", () => {
    expect(validateEmail("weihao@example.com")).toBeNull();
    expect(validateEmail("bad-email")).toBe("Enter a valid email address.");
  });

  it("accepts optional CloudBase-compatible usernames", () => {
    expect(validateUsername("")).toBeNull();
    expect(validateUsername("weihao_01")).toBeNull();
    expect(validateUsername("ielts-user")).toBeNull();
  });

  it("rejects unsafe usernames", () => {
    expect(validateUsername("123456")).toBe("Username cannot be all numbers.");
    expect(validateUsername("-weihao")).toBe("Username must start with a letter or number.");
    expect(validateUsername("ab")).toBe("Username must be 5-24 characters.");
  });

  it("requires password length and mixed character classes", () => {
    expect(validatePassword("abc12345")).toBeNull();
    expect(validatePassword("short1")).toBe("Password must be 8-32 characters.");
    expect(validatePassword("abcdefgh")).toBe("Password must include letters and numbers.");
  });
});

describe("createAuthService", () => {
  it("reads the current CloudBase session user", async () => {
    const client = fakeAuthClient({
      getSession: vi.fn(async () => ({ data: { user, session: {} }, error: null }))
    });
    const service = createAuthService(client);

    await expect(service.getCurrentUser()).resolves.toEqual(user);
  });

  it("treats CloudBase users without a session as signed out", async () => {
    const client = fakeAuthClient({
      getSession: vi.fn(async () => ({ data: { user, session: null }, error: null }))
    });
    const service = createAuthService(client);

    await expect(service.getCurrentUser()).resolves.toBeNull();
  });

  it("normalizes CloudBase SDK user.id to the app uid field", async () => {
    const verifyOtp = vi.fn(async () => ({
      data: { user: sdkUserWithId, session: {} },
      error: null
    }));
    const onAuthStateChange = vi.fn(
      (listener: Parameters<CloudBaseAuthClient["onAuthStateChange"]>[0]) => {
        listener("SIGNED_IN", { user: sdkUserWithId });
        return () => undefined;
      }
    );
    const client = fakeAuthClient({
      getSession: vi.fn(async () => ({ data: { user: sdkUserWithId, session: {} }, error: null })),
      onAuthStateChange,
      signInWithPassword: vi.fn(async () => ({
        data: { user: sdkUserWithId, session: {} },
        error: null
      })),
      signUp: vi.fn(async () => ({
        data: {
          messageId: "message-1",
          verifyOtp
        },
        error: null
      }))
    });
    const service = createAuthService(client);
    const listener = vi.fn();

    await expect(service.getCurrentUser()).resolves.toEqual(normalizedSdkUserWithId);
    await expect(
      service.signIn({ account: "weihao@example.com", password: "abc12345" })
    ).resolves.toEqual(normalizedSdkUserWithId);
    const challenge = await service.startEmailSignUp({
      email: "weihao@example.com",
      username: "weihao_01",
      password: "abc12345"
    });
    await expect(service.completeEmailSignUp(challenge, "123456")).resolves.toEqual(
      normalizedSdkUserWithId
    );
    service.onAuthStateChanged(listener);

    expect(listener).toHaveBeenCalledWith(normalizedSdkUserWithId);
  });

  it("starts email verification registration", async () => {
    const client = fakeAuthClient();
    const service = createAuthService(client);

    const challenge = await service.startEmailSignUp({
      email: "weihao@example.com",
      username: "weihao_01",
      password: "abc12345"
    });

    expect(challenge.email).toBe("weihao@example.com");
    expect(challenge.messageId).toBe("message-1");
    expect(client.signUp).toHaveBeenCalledWith({
      email: "weihao@example.com",
      username: "weihao_01",
      password: "abc12345"
    });
  });

  it("completes email registration with verification code", async () => {
    const client = fakeAuthClient();
    const service = createAuthService(client);
    const challenge = await service.startEmailSignUp({
      email: "weihao@example.com",
      username: "weihao_01",
      password: "abc12345"
    });

    await expect(service.completeEmailSignUp(challenge, "123456")).resolves.toEqual(user);
  });

  it("rejects completed email registration when CloudBase omits the session", async () => {
    const verifyOtp = vi.fn(async () => ({
      data: { user, session: null },
      error: null
    }));
    const client = fakeAuthClient({
      signUp: vi.fn(async () => ({
        data: {
          messageId: "message-1",
          verifyOtp
        },
        error: null
      }))
    });
    const service = createAuthService(client);
    const challenge = await service.startEmailSignUp({
      email: "weihao@example.com",
      username: "weihao_01",
      password: "abc12345"
    });

    await expect(service.completeEmailSignUp(challenge, "123456")).rejects.toMatchObject({
      code: "authentication-failed"
    });
  });

  it("signs in with email/password", async () => {
    const client = fakeAuthClient();
    const service = createAuthService(client);

    await service.signIn({ account: "weihao@example.com", password: "abc12345" });
    expect(client.signInWithPassword).toHaveBeenCalledWith({
      email: "weihao@example.com",
      password: "abc12345"
    });
  });

  it("signs in with username/password", async () => {
    const client = fakeAuthClient();
    const service = createAuthService(client);

    await service.signIn({ account: "bad-email", password: "abc12345" });
    expect(client.signInWithPassword).toHaveBeenCalledWith({
      username: "bad-email",
      password: "abc12345"
    });
  });

  it("rejects password sign in when CloudBase omits the session", async () => {
    const client = fakeAuthClient({
      signInWithPassword: vi.fn(async () => ({
        data: { user, session: null },
        error: null
      }))
    });
    const service = createAuthService(client);

    await expect(
      service.signIn({ account: "weihao@example.com", password: "abc12345" })
    ).rejects.toMatchObject({
      code: "authentication-failed"
    });
  });

  it("wraps CloudBase auth failures in app error codes without exposing the raw message", async () => {
    const rawMessage = "Invalid login credentials.";
    const client = fakeAuthClient({
      signInWithPassword: vi.fn(async () => ({
        data: null,
        error: { message: rawMessage }
      }))
    });
    const service = createAuthService(client);
    let caughtError: unknown;

    try {
      await service.signIn({ account: "weihao@example.com", password: "abc12345" });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError).toMatchObject({
      code: "authentication-failed",
      debugMessage: rawMessage
    });
    expect((caughtError as Error).message).not.toBe(rawMessage);
  });

  it("rejects malformed email sign-in accounts before calling CloudBase", async () => {
    const client = fakeAuthClient();
    const service = createAuthService(client);

    await expect(service.signIn({ account: "weihao@", password: "abc12345" })).rejects.toMatchObject({
      code: "invalid-email"
    });
    expect(client.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects invalid username sign-in accounts before calling CloudBase", async () => {
    const client = fakeAuthClient();
    const service = createAuthService(client);

    await expect(service.signIn({ account: "123456", password: "abc12345" })).rejects.toMatchObject({
      code: "invalid-username"
    });
    expect(client.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs out through CloudBase auth", async () => {
    const signOut = vi.fn(async () => ({ data: {}, error: null }));
    const client = fakeAuthClient({ signOut });
    const service = createAuthService(client);

    await service.signOut();

    expect(signOut).toHaveBeenCalledWith({
      options: {
        clearStorage: false
      }
    });
  });

  it("adapts CloudBase auth state changes to user listeners", () => {
    const unsubscribe = vi.fn();
    const onAuthStateChange = vi.fn((listener: Parameters<CloudBaseAuthClient["onAuthStateChange"]>[0]) => {
      listener("SIGNED_IN", { user });
      return { data: { subscription: { unsubscribe } } };
    });
    const listener = vi.fn();
    const client = fakeAuthClient({ onAuthStateChange });
    const service = createAuthService(client);

    const cleanup = service.onAuthStateChanged(listener);
    cleanup();

    expect(listener).toHaveBeenCalledWith(user);
    expect(unsubscribe).toHaveBeenCalled();
  });
});
