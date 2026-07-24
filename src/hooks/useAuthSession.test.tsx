import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  AuthService,
  EmailSignUpChallenge
} from "../services/cloudbase/authService";
import type { CloudBaseAuthUser } from "../services/cloudbase/cloudbaseTypes";
import { useAuthSession } from "./useAuthSession";

vi.mock("../services/cloudbase/cloudbaseClient", () => ({
  createCloudBaseClient: vi.fn(() => {
    throw new Error("VITE_CLOUDBASE_ENV_ID is required");
  })
}));

const cloudUser: CloudBaseAuthUser = {
  uid: "cloud-user-1",
  email: "weihao@example.com",
  username: "weihao_01",
  accountName: "weihao_01"
};

const signedInUser: CloudBaseAuthUser = {
  uid: "cloud-user-2",
  email: null,
  username: "weihao_02",
  accountName: "weihao_02"
};

const createChallenge = (email = "weihao@example.com"): EmailSignUpChallenge => ({
  email,
  messageId: "message-1",
  verifyOtp: vi.fn()
});

const createAuthService = (currentUser: CloudBaseAuthUser | null = null) => {
  const listeners = new Set<(user: CloudBaseAuthUser | null) => void>();
  const notify = (user: CloudBaseAuthUser | null) => {
    currentUser = user;
    listeners.forEach((listener) => listener(user));
  };

  const service: AuthService = {
    getCurrentUser: vi.fn(async () => currentUser),
    startEmailSignUp: vi.fn(async (credentials) => createChallenge(credentials.email)),
    completeEmailSignUp: vi.fn(async () => {
      notify(cloudUser);
      return cloudUser;
    }),
    signIn: vi.fn(async () => {
      notify(signedInUser);
      return signedInUser;
    }),
    signOut: vi.fn(async () => {
      notify(null);
    }),
    onAuthStateChanged: vi.fn((listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    })
  };

  return { notify, service };
};

describe("useAuthSession", () => {
  it("starts in loading state while the current user is unresolved", () => {
    const { service } = createAuthService();
    vi.mocked(service.getCurrentUser).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuthSession(service));

    expect(result.current).toMatchObject({
      status: "loading",
      user: null,
      errorMessage: null,
      pendingSignUp: null
    });
  });

  it("enters guest state when there is no current user", async () => {
    const { service } = createAuthService(null);

    const { result } = renderHook(() => useAuthSession(service));

    await waitFor(() => expect(result.current.status).toBe("guest"));
    expect(result.current.user).toBeNull();
    expect(result.current.errorMessage).toBeNull();
    expect(service.onAuthStateChanged).toHaveBeenCalledOnce();
  });

  it("enters authenticated state when the service returns a current user", async () => {
    const { service } = createAuthService(cloudUser);

    const { result } = renderHook(() => useAuthSession(service));

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user).toEqual(cloudUser);
    expect(result.current.errorMessage).toBeNull();
  });

  it("updates state when auth state changes outside hook actions", async () => {
    const { notify, service } = createAuthService(null);
    const { result } = renderHook(() => useAuthSession(service));
    await waitFor(() => expect(result.current.status).toBe("guest"));

    act(() => {
      notify(cloudUser);
    });

    expect(result.current.status).toBe("authenticated");
    expect(result.current.user).toEqual(cloudUser);
  });

  it("stores the pending challenge and completes email sign up", async () => {
    const { service } = createAuthService(null);
    const challenge = createChallenge();
    vi.mocked(service.startEmailSignUp).mockResolvedValue(challenge);
    const { result } = renderHook(() => useAuthSession(service));
    await waitFor(() => expect(result.current.status).toBe("guest"));

    await act(async () => {
      await result.current.startEmailSignUp({
        email: "weihao@example.com",
        password: "Password123",
        username: "weihao_01"
      });
    });

    expect(result.current.pendingSignUp).toEqual(challenge);
    expect(result.current.status).toBe("guest");

    await act(async () => {
      await result.current.completeEmailSignUp("123456");
    });

    expect(service.completeEmailSignUp).toHaveBeenCalledWith(challenge, "123456");
    expect(result.current.status).toBe("authenticated");
    expect(result.current.user).toEqual(cloudUser);
    expect(result.current.pendingSignUp).toBeNull();
  });

  it("signs in with an account field and signs out", async () => {
    const { service } = createAuthService(null);
    const { result } = renderHook(() => useAuthSession(service));
    await waitFor(() => expect(result.current.status).toBe("guest"));

    await act(async () => {
      await result.current.signIn({
        account: "weihao_02",
        password: "Password123"
      });
    });

    expect(service.signIn).toHaveBeenCalledWith({
      account: "weihao_02",
      password: "Password123"
    });
    expect(result.current.status).toBe("authenticated");
    expect(result.current.user).toEqual(signedInUser);

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.status).toBe("guest");
    expect(result.current.user).toBeNull();
  });

  it("surfaces service errors as errorMessage", async () => {
    const { service } = createAuthService(null);
    vi.mocked(service.getCurrentUser).mockRejectedValue(new Error("session failed"));

    const { result } = renderHook(() => useAuthSession(service));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorMessage).toBe("session failed");
  });

  it("turns default service creation errors into hook state", async () => {
    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorMessage).toBe("VITE_CLOUDBASE_ENV_ID is required");
  });
});
