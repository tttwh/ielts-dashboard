import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AuthService,
  EmailSignUpChallenge,
  EmailSignUpCredentials,
  PasswordSignInCredentials
} from "../services/cloudbase/authService";
import { createAuthService } from "../services/cloudbase/authService";
import { createCloudBaseClient } from "../services/cloudbase/cloudbaseClient";
import type { CloudBaseAuthUser } from "../services/cloudbase/cloudbaseTypes";

export interface AuthSession {
  status: "loading" | "guest" | "authenticated" | "error";
  user: CloudBaseAuthUser | null;
  errorMessage: string | null;
  pendingSignUp: EmailSignUpChallenge | null;
  startEmailSignUp(credentials: EmailSignUpCredentials): Promise<void>;
  completeEmailSignUp(verificationCode: string): Promise<void>;
  signIn(credentials: PasswordSignInCredentials): Promise<void>;
  signOut(): Promise<void>;
}

const defaultAuthService = () => createAuthService(createCloudBaseClient().auth);

const errorMessageFrom = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Authentication failed.";
};

export function useAuthSession(authService?: AuthService): AuthSession {
  const [status, setStatus] = useState<AuthSession["status"]>("loading");
  const [user, setUser] = useState<CloudBaseAuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingSignUp, setPendingSignUp] = useState<EmailSignUpChallenge | null>(null);
  const defaultAuthServiceRef = useRef<AuthService | null>(null);

  const resolveAuthService = useCallback(() => {
    if (authService) {
      return authService;
    }

    if (!defaultAuthServiceRef.current) {
      defaultAuthServiceRef.current = defaultAuthService();
    }

    return defaultAuthServiceRef.current;
  }, [authService]);

  const setAuthenticatedUser = useCallback((nextUser: CloudBaseAuthUser | null) => {
    setUser(nextUser);
    setErrorMessage(null);
    setStatus(nextUser ? "authenticated" : "guest");
  }, []);

  const setAuthError = useCallback((error: unknown) => {
    setErrorMessage(errorMessageFrom(error));
    setStatus("error");
  }, []);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | null = null;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const service = resolveAuthService();
      unsubscribe = service.onAuthStateChanged((nextUser) => {
        if (isActive) {
          setAuthenticatedUser(nextUser);
        }
      });

      void service
        .getCurrentUser()
        .then((nextUser) => {
          if (isActive) {
            setAuthenticatedUser(nextUser);
          }
        })
        .catch((error) => {
          if (isActive) {
            setAuthError(error);
          }
        });
    } catch (error) {
      setAuthError(error);
    }

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [resolveAuthService, setAuthError, setAuthenticatedUser]);

  const startEmailSignUp = useCallback(
    async (credentials: EmailSignUpCredentials) => {
      try {
        setErrorMessage(null);
        const challenge = await resolveAuthService().startEmailSignUp(credentials);
        setPendingSignUp(challenge);
        setStatus((currentStatus) =>
          currentStatus === "authenticated" ? "authenticated" : "guest"
        );
      } catch (error) {
        setAuthError(error);
      }
    },
    [resolveAuthService, setAuthError]
  );

  const completeEmailSignUp = useCallback(
    async (verificationCode: string) => {
      if (!pendingSignUp) {
        setAuthError(new Error("Start email sign up before completing verification."));
        return;
      }

      try {
        setErrorMessage(null);
        const nextUser = await resolveAuthService().completeEmailSignUp(
          pendingSignUp,
          verificationCode
        );
        setPendingSignUp(null);
        setAuthenticatedUser(nextUser);
      } catch (error) {
        setAuthError(error);
      }
    },
    [pendingSignUp, resolveAuthService, setAuthError, setAuthenticatedUser]
  );

  const signIn = useCallback(
    async (credentials: PasswordSignInCredentials) => {
      try {
        setErrorMessage(null);
        const nextUser = await resolveAuthService().signIn(credentials);
        setPendingSignUp(null);
        setAuthenticatedUser(nextUser);
      } catch (error) {
        setAuthError(error);
      }
    },
    [resolveAuthService, setAuthError, setAuthenticatedUser]
  );

  const signOut = useCallback(async () => {
    try {
      setErrorMessage(null);
      await resolveAuthService().signOut();
      setPendingSignUp(null);
      setAuthenticatedUser(null);
    } catch (error) {
      setAuthError(error);
    }
  }, [resolveAuthService, setAuthError, setAuthenticatedUser]);

  return useMemo(
    () => ({
      status,
      user,
      errorMessage,
      pendingSignUp,
      startEmailSignUp,
      completeEmailSignUp,
      signIn,
      signOut
    }),
    [
      completeEmailSignUp,
      errorMessage,
      pendingSignUp,
      signIn,
      signOut,
      startEmailSignUp,
      status,
      user
    ]
  );
}
