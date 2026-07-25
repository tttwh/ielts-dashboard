import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AuthErrorCode,
  AuthService,
  EmailSignUpChallenge,
  EmailSignUpCredentials,
  PasswordSignInCredentials
} from "../services/cloudbase/authService";
import { AuthError, authErrorCodeFrom, createAuthService } from "../services/cloudbase/authService";
import { createCloudBaseClient } from "../services/cloudbase/cloudbaseClient";
import type { CloudBaseAuthUser } from "../services/cloudbase/cloudbaseTypes";

export interface AuthSession {
  status: "loading" | "guest" | "authenticated" | "error";
  user: CloudBaseAuthUser | null;
  errorCode: AuthErrorCode | null;
  pendingSignUp: EmailSignUpChallenge | null;
  startEmailSignUp(credentials: EmailSignUpCredentials): Promise<void>;
  completeEmailSignUp(verificationCode: string): Promise<void>;
  signIn(credentials: PasswordSignInCredentials): Promise<void>;
  signOut(): Promise<void>;
}

const defaultAuthService = () => createAuthService(createCloudBaseClient().auth);

export function useAuthSession(authService?: AuthService): AuthSession {
  const [status, setStatus] = useState<AuthSession["status"]>("loading");
  const [user, setUser] = useState<CloudBaseAuthUser | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
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
    setErrorCode(null);
    setStatus(nextUser ? "authenticated" : "guest");
  }, []);

  const setAuthError = useCallback((error: unknown) => {
    setErrorCode(authErrorCodeFrom(error));
    setStatus("error");
  }, []);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | null = null;

    setStatus("loading");
    setErrorCode(null);

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
        setErrorCode(null);
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
        setAuthError(new AuthError("missing-sign-up-challenge"));
        return;
      }

      try {
        setErrorCode(null);
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
        setErrorCode(null);
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
      setErrorCode(null);
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
      errorCode,
      pendingSignUp,
      startEmailSignUp,
      completeEmailSignUp,
      signIn,
      signOut
    }),
    [
      completeEmailSignUp,
      errorCode,
      pendingSignUp,
      signIn,
      signOut,
      startEmailSignUp,
      status,
      user
    ]
  );
}
