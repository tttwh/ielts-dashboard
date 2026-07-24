import { Mail, LogIn, LogOut, ShieldCheck } from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type InputHTMLAttributes
} from "react";
import type {
  EmailSignUpCredentials,
  PasswordSignInCredentials
} from "../../services/cloudbase/authService";
import {
  validateEmail,
  validatePassword,
  validateUsername
} from "../../services/cloudbase/authService";
import { useI18n } from "../../i18n/I18nProvider";
import { Button } from "../ui/Button";

export interface AuthPanelProps {
  status: "loading" | "guest" | "authenticated" | "error";
  accountName: string | null;
  pendingSignUpEmail: string | null;
  errorMessage: string | null;
  onSignIn(credentials: PasswordSignInCredentials): Promise<void>;
  onStartEmailSignUp(credentials: EmailSignUpCredentials): Promise<void>;
  onCompleteEmailSignUp(verificationCode: string): Promise<void>;
  onSignOut(): Promise<void>;
}

type AuthMode = "signIn" | "signUp";
type FieldName = "account" | "email" | "username" | "password" | "code";
type FieldErrors = Partial<Record<FieldName, string>>;

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

function TextField({ error, label, ...props }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="min-w-0">
      <label className="block truncate text-xs font-medium uppercase tracking-normal text-muted" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className="mt-1 h-9 w-full min-w-0 rounded-[6px] border border-white/75 bg-white/70 px-2.5 text-sm font-semibold text-ink shadow-[0_1px_0_rgba(255,255,255,0.78)_inset] outline-none backdrop-blur transition focus:border-ielts-blue focus:ring-2 focus:ring-blue-100"
        id={id}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs font-medium leading-4 text-ielts-purple" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const validateAccount = (account: string) => {
  const trimmedAccount = account.trim();
  if (!trimmedAccount) return false;

  return trimmedAccount.includes("@")
    ? validateEmail(trimmedAccount) === null
    : validateUsername(trimmedAccount) === null;
};

export function AuthPanel({
  accountName,
  errorMessage,
  onCompleteEmailSignUp,
  onSignIn,
  onSignOut,
  onStartEmailSignUp,
  pendingSignUpEmail,
  status
}: AuthPanelProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [signInAccount, setSignInAccount] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const isBusy = status === "loading" || isSubmitting;
  const visibleError = formError ?? errorMessage;

  useEffect(() => {
    if (pendingSignUpEmail) {
      setMode("signUp");
    }
  }, [pendingSignUpEmail]);

  const resetErrors = () => {
    setFieldErrors({});
    setFormError(null);
  };

  const submitSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetErrors();

    const nextErrors: FieldErrors = {};
    if (!validateAccount(signInAccount)) {
      nextErrors.account = t.auth.validation.accountHelp;
    }
    if (validatePassword(signInPassword)) {
      nextErrors.password = t.auth.validation.passwordHelp;
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSignIn({
        account: signInAccount.trim(),
        password: signInPassword
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitStartSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetErrors();

    const trimmedEmail = signUpEmail.trim();
    const trimmedUsername = signUpUsername.trim();
    const nextErrors: FieldErrors = {};
    if (validateEmail(trimmedEmail)) {
      nextErrors.email = t.auth.validation.emailHelp;
    }
    if (validateUsername(trimmedUsername)) {
      nextErrors.username = t.auth.validation.usernameHelp;
    }
    if (validatePassword(signUpPassword)) {
      nextErrors.password = t.auth.validation.passwordHelp;
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const credentials: EmailSignUpCredentials = {
      email: trimmedEmail,
      password: signUpPassword
    };
    if (trimmedUsername) {
      credentials.username = trimmedUsername;
    }

    setIsSubmitting(true);
    try {
      await onStartEmailSignUp(credentials);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCompleteSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetErrors();

    const trimmedCode = verificationCode.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setFieldErrors({ code: t.auth.validation.codeHelp });
      return;
    }

    setIsSubmitting(true);
    try {
      await onCompleteEmailSignUp(trimmedCode);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSignOut = async () => {
    resetErrors();
    setIsSubmitting(true);
    try {
      await onSignOut();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "authenticated") {
    return (
      <section className="glass-panel min-w-0 p-3" data-testid="auth-panel">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted">
              {t.auth.title}
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-ink">
              {t.auth.signedInAs(accountName ?? t.auth.account)}
            </p>
          </div>
          <Button className="shrink-0 gap-1.5" disabled={isSubmitting} onClick={submitSignOut}>
            <LogOut aria-hidden="true" size={15} strokeWidth={2.25} />
            {t.auth.signOut}
          </Button>
        </div>
        {visibleError ? <p className="mt-2 text-xs font-medium text-ielts-purple">{visibleError}</p> : null}
      </section>
    );
  }

  return (
    <section className="glass-panel min-w-0 p-3" data-testid="auth-panel">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted">
            {t.auth.title}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {status === "loading" ? t.auth.loading : t.auth.guest}
          </p>
        </div>
        <div
          aria-label={t.auth.title}
          className="inline-flex h-8 min-w-[9.5rem] overflow-hidden rounded-[6px] border border-white/75 bg-white/55 p-0.5"
          role="group"
        >
          {(["signIn", "signUp"] as const).map((nextMode) => {
            const isActive = nextMode === mode;
            const label = nextMode === "signIn" ? t.auth.signIn : t.auth.signUp;

            return (
              <button
                aria-pressed={isActive}
                className={`min-w-0 flex-1 rounded-[5px] px-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-ielts-blue text-white shadow-sm"
                    : "text-muted hover:bg-white/80 hover:text-ink"
                }`}
                disabled={isBusy}
                key={nextMode}
                onClick={() => {
                  setMode(nextMode);
                  resetErrors();
                }}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {visibleError ? (
        <p className="mt-2 break-words text-xs font-medium leading-4 text-ielts-purple">
          {visibleError}
        </p>
      ) : null}

      {status === "loading" ? null : mode === "signIn" ? (
        <form
          aria-label={t.auth.signIn}
          className="mt-3 grid min-w-0 gap-2"
          noValidate
          onSubmit={submitSignIn}
        >
          <TextField
            autoComplete="username"
            error={fieldErrors.account}
            label={t.auth.account}
            onChange={(event) => setSignInAccount(event.currentTarget.value)}
            type="text"
            value={signInAccount}
          />
          <TextField
            autoComplete="current-password"
            error={fieldErrors.password}
            label={t.auth.password}
            onChange={(event) => setSignInPassword(event.currentTarget.value)}
            type="password"
            value={signInPassword}
          />
          <Button className="mt-1 w-full gap-1.5" disabled={isBusy} type="submit" variant="primary">
            <LogIn aria-hidden="true" size={15} strokeWidth={2.25} />
            {t.auth.signIn}
          </Button>
        </form>
      ) : pendingSignUpEmail ? (
        <form
          aria-label={t.auth.completeSignUp}
          className="mt-3 grid min-w-0 gap-2"
          noValidate
          onSubmit={submitCompleteSignUp}
        >
          <div className="min-w-0 rounded-[6px] border border-white/70 bg-white/55 px-2.5 py-2">
            <p className="break-words text-sm font-semibold text-ink">{pendingSignUpEmail}</p>
          </div>
          <TextField
            autoComplete="one-time-code"
            error={fieldErrors.code}
            inputMode="numeric"
            label={t.auth.verificationCode}
            maxLength={6}
            onChange={(event) => setVerificationCode(event.currentTarget.value)}
            pattern="[0-9]*"
            type="text"
            value={verificationCode}
          />
          <Button className="mt-1 w-full gap-1.5" disabled={isBusy} type="submit" variant="primary">
            <ShieldCheck aria-hidden="true" size={15} strokeWidth={2.25} />
            {t.auth.completeSignUp}
          </Button>
        </form>
      ) : (
        <form
          aria-label={t.auth.signUp}
          className="mt-3 grid min-w-0 gap-2"
          noValidate
          onSubmit={submitStartSignUp}
        >
          <TextField
            autoComplete="email"
            error={fieldErrors.email}
            label={t.auth.email}
            onChange={(event) => setSignUpEmail(event.currentTarget.value)}
            type="email"
            value={signUpEmail}
          />
          <TextField
            autoComplete="username"
            error={fieldErrors.username}
            label={t.auth.username}
            onChange={(event) => setSignUpUsername(event.currentTarget.value)}
            type="text"
            value={signUpUsername}
          />
          <TextField
            autoComplete="new-password"
            error={fieldErrors.password}
            label={t.auth.password}
            onChange={(event) => setSignUpPassword(event.currentTarget.value)}
            type="password"
            value={signUpPassword}
          />
          <Button className="mt-1 w-full gap-1.5" disabled={isBusy} type="submit" variant="primary">
            <Mail aria-hidden="true" size={15} strokeWidth={2.25} />
            {t.auth.sendVerificationCode}
          </Button>
        </form>
      )}
    </section>
  );
}
