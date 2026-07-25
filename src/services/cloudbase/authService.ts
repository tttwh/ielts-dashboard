import type {
  CloudBaseAuthClient,
  CloudBaseAuthResponse,
  CloudBaseAuthResponseData,
  CloudBaseAuthUser,
  CloudBaseRawAuthUser
} from "./cloudbaseTypes";

export interface EmailSignUpCredentials {
  email: string;
  password: string;
  username?: string;
}

export interface PasswordSignInCredentials {
  account: string;
  password: string;
}

export interface EmailSignUpChallenge {
  email: string;
  messageId: string | null;
  verifyOtp: NonNullable<CloudBaseAuthResponseData["verifyOtp"]>;
}

export interface AuthService {
  getCurrentUser(): Promise<CloudBaseAuthUser | null>;
  startEmailSignUp(credentials: EmailSignUpCredentials): Promise<EmailSignUpChallenge>;
  completeEmailSignUp(challenge: EmailSignUpChallenge, verificationCode: string): Promise<CloudBaseAuthUser>;
  signIn(credentials: PasswordSignInCredentials): Promise<CloudBaseAuthUser>;
  signOut(): Promise<void>;
  onAuthStateChanged(listener: (user: CloudBaseAuthUser | null) => void): () => void;
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (!value) return null;
  if (value.length < 5 || value.length > 24) return "Username must be 5-24 characters.";
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) return "Username must start with a letter or number.";
  if (/^\d+$/.test(value)) return "Username cannot be all numbers.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 32) return "Password must be 8-32 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include letters and numbers.";
  }
  return null;
}

const assertCloudBaseOk = (result: CloudBaseAuthResponse): CloudBaseAuthResponseData | null => {
  if (result.error) {
    throw new Error(result.error.message ?? "CloudBase authentication failed.");
  }
  return result.data;
};

const assertValidEmail = (email: string) => {
  const emailError = validateEmail(email);
  if (emailError) throw new Error(emailError);
};

const assertValidPassword = (password: string) => {
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
};

const normalizeCloudBaseUser = (
  user: CloudBaseRawAuthUser | null | undefined
): CloudBaseAuthUser | null => {
  const uid = user?.uid ?? user?.id;
  if (!user || !uid) {
    return null;
  }

  return {
    uid,
    email: user.email ?? null,
    username: user.username ?? null,
    accountName: user.accountName ?? null
  };
};

const requireUser = (user: CloudBaseRawAuthUser | null | undefined): CloudBaseAuthUser => {
  const normalizedUser = normalizeCloudBaseUser(user);
  if (!normalizedUser) {
    throw new Error("CloudBase did not return an authenticated user.");
  }
  return normalizedUser;
};

export function createAuthService(authClient: CloudBaseAuthClient): AuthService {
  return {
    async getCurrentUser() {
      return normalizeCloudBaseUser(assertCloudBaseOk(await authClient.getSession())?.user);
    },

    async startEmailSignUp(credentials) {
      const email = credentials.email.trim();
      const username = credentials.username?.trim() || undefined;

      assertValidEmail(email);
      const usernameError = validateUsername(username ?? "");
      if (usernameError) throw new Error(usernameError);
      assertValidPassword(credentials.password);

      const signUpInput: { email: string; password: string; username?: string } = {
        email,
        password: credentials.password
      };
      if (username) {
        signUpInput.username = username;
      }

      const data = assertCloudBaseOk(await authClient.signUp(signUpInput));
      if (!data?.verifyOtp) {
        throw new Error("CloudBase did not return a verification handler.");
      }

      return {
        email,
        messageId: data.messageId ?? null,
        verifyOtp: data.verifyOtp
      };
    },

    async completeEmailSignUp(challenge, verificationCode) {
      const token = verificationCode.trim();
      if (!/^\d{6}$/.test(token)) {
        throw new Error("Verification code must be 6 digits.");
      }

      const data = assertCloudBaseOk(
        await challenge.verifyOtp({
          token,
          messageId: challenge.messageId ?? undefined
        })
      );
      return requireUser(data?.user);
    },

    async signIn(credentials) {
      const account = credentials.account.trim();
      const isEmailAccount = account.includes("@");

      if (isEmailAccount) {
        assertValidEmail(account);
      } else {
        const usernameError = validateUsername(account);
        if (usernameError) throw new Error(usernameError);
      }
      assertValidPassword(credentials.password);

      const data = assertCloudBaseOk(
        await authClient.signInWithPassword({
          [isEmailAccount ? "email" : "username"]: account,
          password: credentials.password
        })
      );
      return requireUser(data?.user);
    },

    async signOut() {
      const result = await authClient.signOut();
      if (result) {
        assertCloudBaseOk(result);
      }
    },

    onAuthStateChanged(listener) {
      const subscription = authClient.onAuthStateChange((_event, session) =>
        listener(normalizeCloudBaseUser(session?.user))
      );
      if (typeof subscription === "function") {
        return subscription;
      }

      return () => {
        subscription.data?.subscription?.unsubscribe();
      };
    }
  };
}
