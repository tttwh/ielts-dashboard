# CloudBase Sync Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RMB-payable CloudBase PG account registration, login, local-first cloud sync, and verified user data isolation for the IELTS dashboard.

**Architecture:** Keep the dashboard local-first. React UI writes to local state and LocalStorage immediately, while a sync manager imports, merges, and pushes authenticated user data through a CloudBase PG repository. CloudBase-specific SDK calls stay inside `src/services/cloudbase`, and UI components consume typed auth/sync state instead of calling CloudBase directly.

**Tech Stack:** React, TypeScript, Vite, Vitest, Playwright, `@cloudbase/js-sdk`, Tencent Cloud CloudBase PG mode, PostgreSQL RLS.

## Global Constraints

- Backend must be Tencent Cloud CloudBase PG mode and must support RMB payment.
- Registration is open in phase one, with `profiles.status` reserved for later whitelist or disabled-account control.
- Use CloudBase email verification registration and password login in phase one; do not implement custom SMTP, phone login, OAuth, or Aliyun.
- Guest mode must keep working with LocalStorage.
- Frontend must never commit Tencent SecretId, SecretKey, manager credentials, API Key, service token, or test account passwords.
- CloudBase Web SDK config may include only environment id, region, and publishable access key.
- All user-owned PG tables must enable RLS and enforce ownership with `user_id = auth.uid()`. CloudBase PG user ids are strings: `auth.users.id` is `varchar(64)` and `auth.uid()` returns text.
- UI must keep Chinese/English visible text coverage.
- Desktop and mobile layouts must be checked.
- Before final completion, run `npm.cmd run test`, `npm.cmd run build`, `npm.cmd run test:e2e`, strict TypeScript unused checks, browser desktop/mobile checks, CloudBase manual checks, and GitHub push verification.
- On macOS, use `npm run ...` instead of `npm.cmd run ...`; Windows remains the primary command format in this plan.

---

## File Structure

Create:

- `src/services/cloudbase/cloudbaseTypes.ts`: narrow app-owned TypeScript interfaces for CloudBase Auth and RDB clients, so tests can use fakes without depending on CloudBase internals.
- `src/services/cloudbase/cloudbaseClient.ts`: reads Vite env, validates CloudBase config, initializes the SDK, and exposes `createCloudBaseClient()`.
- `src/services/cloudbase/cloudbaseClient.test.ts`: config validation tests.
- `src/services/cloudbase/authService.ts`: email verification registration, password login validation, and auth operations.
- `src/services/cloudbase/authService.test.ts`: auth validation and mocked auth operation tests.
- `cloudbase/sql/cloud-sync-auth.sql`: PostgreSQL schema and RLS policies.
- `scripts/verify-cloudbase-sql.mjs`: static SQL safety checker.
- `src/services/cloudbase/cloudMappers.ts`: domain object to PG row conversion.
- `src/services/cloudbase/cloudMappers.test.ts`: mapper round-trip tests.
- `src/services/cloudbase/cloudRepository.ts`: CloudBase PG load/upsert repository.
- `src/services/cloudbase/cloudRepository.test.ts`: fake RDB tests.
- `src/services/sync/syncTypes.ts`: auth/sync state and result types.
- `src/services/sync/syncManager.ts`: pure merge/import/dirty-state sync logic.
- `src/services/sync/syncManager.test.ts`: first-login import, merge, and dirty sync tests.
- `src/hooks/useAuthSession.ts`: React hook for auth session state.
- `src/hooks/useAuthSession.test.tsx`: hook tests with fake auth service.
- `src/components/auth/AuthPanel.tsx`: account sign-up/sign-in/logout panel.
- `src/components/auth/AuthPanel.test.tsx`: validation, submit, and logout UI tests.
- `scripts/find-runtime-unused.mjs`: runtime source reachability check from `src/main.tsx`.
- `.env.example`: safe CloudBase public config template.

Modify:

- `package.json`: add exact-pinned CloudBase dependency, `verify:cloudbase-sql`, and `verify:unused-runtime`.
- `package-lock.json`: commit dependency lockfile update.
- `src/domain/types.ts`: expand sync status and profile status fields.
- `src/services/storage/storageTypes.ts`: add async-capable repository/sync metadata types.
- `src/services/storage/appRepository.ts`: preserve LocalStorage repository and expose helper for user-id replacement.
- `src/services/storage/localStorageAdapter.ts`: validate new schema fields.
- `src/hooks/useDashboardData.ts`: accept sync manager and expose sync/auth state.
- `src/App.tsx`: wire auth hook, sync manager, and UI shell.
- `src/components/layout/AppShell.tsx`: render compact account/sync area.
- `src/pages/SettingsPage.tsx`: show account status and local/cloud storage copy.
- `src/i18n/translations.ts`: add Chinese/English auth and sync strings.
- `tests/e2e/dashboard.spec.ts`: add auth panel validation and no-overflow coverage.
- `tests/e2e/scaffold.smoke.spec.ts`: keep guest, persistence, timer, and mobile checks passing.
- `README.md`: document CloudBase PG setup, RMB service choice, local-first sync, and secret safety.

---

### Task 1: CloudBase SDK Config And Client Boundary

**Files:**
- Create: `src/services/cloudbase/cloudbaseTypes.ts`
- Create: `src/services/cloudbase/cloudbaseClient.ts`
- Create: `src/services/cloudbase/cloudbaseClient.test.ts`
- Create: `.env.example`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces:
  - `CloudBaseConfig`
  - `readCloudBaseConfig(env?: ImportMetaEnv): CloudBaseConfig`
  - `createCloudBaseClient(config?: CloudBaseConfig): CloudBaseClient`
  - `CloudBaseClient` with `auth: CloudBaseAuthClient` and `rdb(): CloudBaseRdbClient`

- [ ] **Step 1: Install the SDK with an exact lockfile entry**

Run on Windows:

```powershell
npm.cmd install @cloudbase/js-sdk@3 --save-exact
```

Run on macOS:

```bash
npm install @cloudbase/js-sdk@3 --save-exact
```

Expected:

- `package.json` includes a fixed `@cloudbase/js-sdk` version, not `"latest"` and not a caret range.
- `package-lock.json` is updated.

- [ ] **Step 2: Add safe environment template**

Create `.env.example`:

```dotenv
VITE_CLOUDBASE_ENV_ID=
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_ACCESS_KEY=
```

Do not create `.env` in git. If local testing needs real values, create `.env.local` manually and keep it untracked.

- [ ] **Step 3: Define narrow CloudBase interfaces**

Create `src/services/cloudbase/cloudbaseTypes.ts`:

```ts
export interface CloudBaseConfig {
  envId: string;
  region: string;
  accessKey: string;
}

export interface CloudBaseAuthUser {
  uid: string;
  email: string | null;
  username: string | null;
  accountName: string | null;
}

export interface CloudBaseAuthError {
  message?: string;
  code?: string;
}

export interface CloudBaseAuthResponseData {
  user?: CloudBaseAuthUser | null;
  session?: unknown;
  messageId?: string;
  verifyOtp?: (params: { token: string; messageId?: string }) => Promise<CloudBaseAuthResponse>;
}

export interface CloudBaseAuthResponse {
  data: CloudBaseAuthResponseData | null;
  error: CloudBaseAuthError | null;
}

export interface CloudBaseAuthClient {
  signUp(input: { email: string; password: string; username?: string }): Promise<CloudBaseAuthResponse>;
  signInWithPassword(input: { email?: string; username?: string; password: string }): Promise<CloudBaseAuthResponse>;
  signOut(input?: { options?: { clearStorage?: boolean } }): Promise<CloudBaseAuthResponse | void>;
  getSession(): Promise<CloudBaseAuthResponse>;
  onAuthStateChange(
    listener: (event: string, session: { user?: CloudBaseAuthUser | null } | null) => void
  ): { data?: { subscription?: { unsubscribe(): void } } } | (() => void);
}

export interface CloudBaseRdbResult<T> {
  data: T[] | T | null;
  error: { message?: string; code?: string } | null;
}

export interface CloudBaseRdbQuery<T> {
  select(columns?: string, options?: Record<string, unknown>): Promise<CloudBaseRdbResult<T>>;
  eq(column: string, value: unknown): CloudBaseRdbQuery<T>;
  upsert(values: T | T[], options?: { onConflict?: string }): Promise<CloudBaseRdbResult<T>>;
}

export interface CloudBaseRdbClient {
  from<T>(tableName: string): CloudBaseRdbQuery<T>;
}

export interface CloudBaseClient {
  auth: CloudBaseAuthClient;
  rdb(): CloudBaseRdbClient;
}
```

- [ ] **Step 4: Write failing config tests**

Create `src/services/cloudbase/cloudbaseClient.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readCloudBaseConfig } from "./cloudbaseClient";

const env = (overrides: Partial<ImportMetaEnv> = {}) =>
  ({
    VITE_CLOUDBASE_ENV_ID: "test-env",
    VITE_CLOUDBASE_REGION: "ap-shanghai",
    VITE_CLOUDBASE_ACCESS_KEY: "publishable-test-key",
    ...overrides
  }) as ImportMetaEnv;

describe("readCloudBaseConfig", () => {
  it("reads CloudBase public config from Vite env", () => {
    expect(readCloudBaseConfig(env())).toEqual({
      envId: "test-env",
      region: "ap-shanghai",
      accessKey: "publishable-test-key"
    });
  });

  it("defaults region to ap-shanghai", () => {
    expect(readCloudBaseConfig(env({ VITE_CLOUDBASE_REGION: "" }))).toMatchObject({
      region: "ap-shanghai"
    });
  });

  it("rejects missing environment id", () => {
    expect(() => readCloudBaseConfig(env({ VITE_CLOUDBASE_ENV_ID: "" }))).toThrow(
      "VITE_CLOUDBASE_ENV_ID is required"
    );
  });

  it("rejects missing publishable access key", () => {
    expect(() => readCloudBaseConfig(env({ VITE_CLOUDBASE_ACCESS_KEY: "" }))).toThrow(
      "VITE_CLOUDBASE_ACCESS_KEY is required"
    );
  });
});
```

- [ ] **Step 5: Run the failing test**

Run:

```powershell
npm.cmd run test -- src/services/cloudbase/cloudbaseClient.test.ts
```

Expected: fails because `cloudbaseClient.ts` does not exist.

- [ ] **Step 6: Implement the CloudBase client wrapper**

Create `src/services/cloudbase/cloudbaseClient.ts`:

```ts
import cloudbase from "@cloudbase/js-sdk";
import type { CloudBaseClient, CloudBaseConfig } from "./cloudbaseTypes";

const requiredValue = (name: string, value: string | undefined) => {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) {
    throw new Error(`${name} is required`);
  }
  return trimmedValue;
};

export function readCloudBaseConfig(env: ImportMetaEnv = import.meta.env): CloudBaseConfig {
  return {
    envId: requiredValue("VITE_CLOUDBASE_ENV_ID", env.VITE_CLOUDBASE_ENV_ID),
    region: env.VITE_CLOUDBASE_REGION?.trim() || "ap-shanghai",
    accessKey: requiredValue("VITE_CLOUDBASE_ACCESS_KEY", env.VITE_CLOUDBASE_ACCESS_KEY)
  };
}

export function createCloudBaseClient(config: CloudBaseConfig = readCloudBaseConfig()): CloudBaseClient {
  return cloudbase.init({
    env: config.envId,
    region: config.region,
    accessKey: config.accessKey,
    auth: {
      detectSessionInUrl: true
    }
  }) as unknown as CloudBaseClient;
}
```

- [ ] **Step 7: Verify Task 1**

Run:

```powershell
npm.cmd run test -- src/services/cloudbase/cloudbaseClient.test.ts
npm.cmd run build
```

Expected:

- CloudBase client tests pass.
- Build passes.

- [ ] **Step 8: Commit Task 1**

```powershell
git add package.json package-lock.json .env.example src/services/cloudbase/cloudbaseTypes.ts src/services/cloudbase/cloudbaseClient.ts src/services/cloudbase/cloudbaseClient.test.ts
git commit -m "feat: add cloudbase client config"
```

---

### Task 2: Email Verification Auth Service

**Files:**
- Create: `src/services/cloudbase/authService.ts`
- Create: `src/services/cloudbase/authService.test.ts`

**Interfaces:**
- Consumes:
  - `CloudBaseAuthClient`
  - `CloudBaseAuthUser`
- Produces:
  - `EmailSignUpCredentials`
  - `PasswordSignInCredentials`
  - `EmailSignUpChallenge`
  - `validateEmail(email: string): string | null`
  - `validateUsername(username: string): string | null`
  - `validatePassword(password: string): string | null`
  - `createAuthService(authClient: CloudBaseAuthClient): AuthService`

- [ ] **Step 1: Write failing auth service tests**

Create `src/services/cloudbase/authService.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { CloudBaseAuthClient } from "./cloudbaseTypes";
import {
  createAuthService,
  validateEmail,
  validateUsername,
  validatePassword
} from "./authService";

const user = {
  uid: "u-1",
  email: "weihao@example.com",
  username: "weihao_01",
  accountName: "weihao_01"
};

const fakeAuthClient = (): CloudBaseAuthClient => ({
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
  onAuthStateChange: vi.fn(() => () => undefined)
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

  it("signs in with email/password", async () => {
    const client = fakeAuthClient();
    const service = createAuthService(client);

    await service.signIn({ account: "weihao@example.com", password: "abc12345" });
    expect(client.signInWithPassword).toHaveBeenCalledWith({
      email: "weihao@example.com",
      password: "abc12345"
    });
  });

  it("surfaces invalid credentials before calling CloudBase", async () => {
    const client = fakeAuthClient();
    const service = createAuthService(client);

    await expect(service.signIn({ account: "bad-email", password: "bad" })).rejects.toThrow(
      "Enter a valid email address."
    );
    expect(client.signInWithPassword).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run failing tests**

```powershell
npm.cmd run test -- src/services/cloudbase/authService.test.ts
```

Expected: fails because `authService.ts` does not exist.

- [ ] **Step 3: Implement auth service**

Create `src/services/cloudbase/authService.ts`:

```ts
import type { CloudBaseAuthClient, CloudBaseAuthUser } from "./cloudbaseTypes";

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
  verifyOtp(params: { token: string; messageId?: string }): Promise<{
    data: { user?: CloudBaseAuthUser | null } | null;
    error: { message?: string; code?: string } | null;
  }>;
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
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

const assertValidPassword = (password: string) => {
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
};

const assertCloudBaseOk = <T>(result: { data: T | null; error: { message?: string } | null }) => {
  if (result.error) throw new Error(result.error.message ?? "CloudBase authentication failed.");
  return result.data;
};

const requireUser = (user: CloudBaseAuthUser | null): CloudBaseAuthUser => {
  if (!user?.uid) throw new Error("CloudBase did not return an authenticated user.");
  return user;
};

export function createAuthService(authClient: CloudBaseAuthClient): AuthService {
  return {
    async getCurrentUser() {
      return assertCloudBaseOk(await authClient.getSession())?.user ?? null;
    },
    async startEmailSignUp(credentials) {
      const email = credentials.email.trim();
      const username = credentials.username?.trim() || undefined;
      const emailError = validateEmail(email);
      if (emailError) throw new Error(emailError);
      const usernameError = validateUsername(username ?? "");
      if (usernameError) throw new Error(usernameError);
      assertValidPassword(credentials.password);

      const data = assertCloudBaseOk(await authClient.signUp({
        email,
        username,
        password: credentials.password
      }));
      if (!data?.verifyOtp) throw new Error("CloudBase did not return a verification handler.");
      return {
        email,
        messageId: data.messageId ?? null,
        verifyOtp: data.verifyOtp
      };
    },
    async completeEmailSignUp(challenge, verificationCode) {
      const token = verificationCode.trim();
      if (!/^\d{6}$/.test(token)) throw new Error("Verification code must be 6 digits.");
      const data = assertCloudBaseOk(await challenge.verifyOtp({
        token,
        messageId: challenge.messageId ?? undefined
      }));
      return requireUser(data?.user ?? null);
    },
    async signIn(credentials) {
      const account = credentials.account.trim();
      if (account.includes("@")) {
        const emailError = validateEmail(account);
        if (emailError) throw new Error(emailError);
      } else {
        const usernameError = validateUsername(account);
        if (usernameError) throw new Error(usernameError);
      }
      assertValidPassword(credentials.password);
      const data = assertCloudBaseOk(await authClient.signInWithPassword({
        [account.includes("@") ? "email" : "username"]: account,
        password: credentials.password
      }));
      return requireUser(data?.user ?? null);
    },
    async signOut() {
      await authClient.signOut();
    },
    onAuthStateChanged(listener) {
      const subscription = authClient.onAuthStateChange((_event, session) => listener(session?.user ?? null));
      if (typeof subscription === "function") return subscription;
      return () => subscription.data?.subscription?.unsubscribe();
    }
  };
}
```

- [ ] **Step 4: Verify Task 2**

```powershell
npm.cmd run test -- src/services/cloudbase/authService.test.ts
npm.cmd run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit Task 2**

```powershell
git add src/services/cloudbase/authService.ts src/services/cloudbase/authService.test.ts
git commit -m "feat: add cloudbase auth service"
```

---

### Task 3: CloudBase PG Schema And RLS

**Files:**
- Create: `cloudbase/sql/cloud-sync-auth.sql`
- Create: `scripts/verify-cloudbase-sql.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - SQL tables: `profiles`, `goals`, `daily_records`, `timer_sessions`, `achievements`
  - RLS ownership policies for all user-owned tables
  - Script command: `node scripts/verify-cloudbase-sql.mjs`

- [ ] **Step 1: Create SQL schema**

Create `cloudbase/sql/cloud-sync-auth.sql` from the current phase-one schema in `cloudbase/sql/cloud-sync-auth.sql`.

Required current schema constraints:

- Phase one has five cloud tables: `profiles`, `goals`, `daily_records`, `timer_sessions`, `achievements`.
- Do not add a cloud language or settings table in phase one; UI language remains local-only in the `ielts-dashboard-language` LocalStorage key.
- `profiles.user_id` and `goals.user_id` are the row keys for their one-row-per-user tables.
- `daily_records.record_id` is `text not null`, scoped by `user_id`, and the table primary key is `(user_id, record_id)`.
- `timer_sessions.session_id` is `text not null`, scoped by `user_id`, and the table primary key is `(user_id, session_id)` to avoid cross-user timer conflicts.
- RLS must be enabled on every phase-one user-owned table, with ownership policies based on `user_id = (select auth.uid())`.

- [ ] **Step 2: Create SQL safety checker**

Create `scripts/verify-cloudbase-sql.mjs` from the current checker in `scripts/verify-cloudbase-sql.mjs`.

The checker must cover the five phase-one tables, reject forbidden credential markers, require ownership policies, require `daily_records primary key (user_id, record_id)`, require `timer_sessions primary key (user_id, session_id)`, and reject stale UUID-shaped app IDs.

- [ ] **Step 3: Add script command**

Modify `package.json` scripts:

```json
"verify:cloudbase-sql": "node ./scripts/verify-cloudbase-sql.mjs"
```

- [ ] **Step 4: Verify Task 3**

Run:

```powershell
npm.cmd run verify:cloudbase-sql
npm.cmd run test
npm.cmd run build
```

Expected:

- SQL checker prints `CloudBase SQL verification passed`.
- Tests and build pass.

- [ ] **Step 5: Manual CloudBase console SQL check**

In CloudBase PG SQL console, run the SQL against a test environment only.

Expected:

- SQL runs without syntax errors.
- All five phase-one tables appear.
- RLS is enabled on all five phase-one tables.

If CloudBase PG rejects `auth.users(id)` or `auth.uid()`, stop the task, replace only those auth references with the exact CloudBase PG documented equivalent, rerun this step, and keep the ownership policy shape identical.

- [ ] **Step 6: Commit Task 3**

```powershell
git add package.json cloudbase/sql/cloud-sync-auth.sql scripts/verify-cloudbase-sql.mjs
git commit -m "feat: add cloudbase pg schema"
```

---

### Task 4: Domain To Cloud Row Mappers

**Files:**
- Create: `src/services/cloudbase/cloudMappers.ts`
- Create: `src/services/cloudbase/cloudMappers.test.ts`

**Interfaces:**
- Consumes: `AppState`, `UserProfile`, `DailyGoals`, `DailyRecord`, `TimerSession`, `Achievement`
- Produces:
  - `CloudRows`
  - `appStateToCloudRows(state: AppState, accountName: string | null): CloudRows`
  - `cloudRowsToAppState(rows: CloudRows, fallbackState: AppState): AppState`

- [ ] **Step 1: Write mapper tests**

Create `src/services/cloudbase/cloudMappers.test.ts` with fixture-based tests:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "../../domain/defaults";
import { appStateToCloudRows, cloudRowsToAppState } from "./cloudMappers";

describe("CloudBase cloud mappers", () => {
  it("maps app state to normalized PG rows", () => {
    const state = createDefaultAppState("2026-07-24T00:00:00.000Z");

    const rows = appStateToCloudRows(state, "weihao_01");

    expect(rows.profile).toMatchObject({
      user_id: state.profile.userId,
      account_name: "weihao_01",
      status: "active"
    });
    expect(rows.goals).toMatchObject({
      user_id: state.profile.userId,
      overall_band: state.profile.targetBand,
      words_target: state.dailyGoals.wordsTarget
    });
    expect(rows.records).toEqual([]);
    expect(rows.timerSessions).toEqual([]);
    expect(rows.achievements.length).toBeGreaterThan(0);
  });

  it("maps normalized PG rows back to app state", () => {
    const fallback = createDefaultAppState("2026-07-24T00:00:00.000Z");
    const rows = appStateToCloudRows(fallback, "weihao_01");

    const restored = cloudRowsToAppState(rows, fallback);

    expect(restored.profile.userId).toBe(fallback.profile.userId);
    expect(restored.profile.targetBand).toBe(fallback.profile.targetBand);
    expect(restored.dailyGoals.wordsTarget).toBe(fallback.dailyGoals.wordsTarget);
  });
});
```

- [ ] **Step 2: Run failing mapper tests**

```powershell
npm.cmd run test -- src/services/cloudbase/cloudMappers.test.ts
```

Expected: fails because mapper file does not exist.

- [ ] **Step 3: Implement mapper types and conversion functions**

Create `src/services/cloudbase/cloudMappers.ts` with explicit row types for each table. Include these exported names:

```ts
export interface ProfileRow {
  user_id: string;
  account_name: string | null;
  status: "active" | "disabled" | "pending";
  display_name: string | null;
  created_at: string;
  updated_at: string;
}
```

Implement row interfaces for `UserSettingsRow`, `GoalsRow`, `DailyRecordRow`, `TimerSessionRow`, and `AchievementRow`. Use snake_case table columns and convert to existing camelCase domain fields.

Required conversions:

- `overall_band` <-> `profile.targetBand`
- section band columns <-> `profile.sectionTargets`
- `section_minutes_target` <-> `dailyGoals.sectionMinutesTarget`
- `record_date` <-> `DailyRecord.date`
- `words_memorized` <-> `DailyRecord.words`
- `section_minutes` <-> `DailyRecord.sectionMinutes`
- `source` <-> `TimerSession.source`
- `unlocked_at` <-> `Achievement.unlockedAt`

Every domain object restored from cloud must use `syncStatus: "synced"` and preserve `deletedAt`.

- [ ] **Step 4: Verify Task 4**

```powershell
npm.cmd run test -- src/services/cloudbase/cloudMappers.test.ts
npm.cmd run build
```

Expected: mapper tests and build pass.

- [ ] **Step 5: Commit Task 4**

```powershell
git add src/services/cloudbase/cloudMappers.ts src/services/cloudbase/cloudMappers.test.ts
git commit -m "feat: add cloudbase data mappers"
```

---

### Task 5: CloudBase PG Repository

**Files:**
- Create: `src/services/cloudbase/cloudRepository.ts`
- Create: `src/services/cloudbase/cloudRepository.test.ts`

**Interfaces:**
- Consumes:
  - `CloudBaseRdbClient`
  - `appStateToCloudRows`
  - `cloudRowsToAppState`
- Produces:
  - `CloudRepository`
  - `createCloudRepository(rdb: CloudBaseRdbClient): CloudRepository`

- [ ] **Step 1: Write repository tests with fake RDB**

Create `src/services/cloudbase/cloudRepository.test.ts` with tests for:

- `loadCloudState` selects each table using `.eq("user_id", userId)`
- empty profile/goals returns `null`
- `saveCloudState` upserts all table rows with correct conflict targets
- CloudBase errors throw readable messages

Use a fake RDB object that records calls:

```ts
const calls: string[] = [];
const fakeRdb = {
  from: (tableName: string) => ({
    eq: (column: string, value: unknown) => {
      calls.push(`${tableName}.eq(${column},${String(value)})`);
      return fakeRdb.from(tableName);
    },
    select: async () => ({ data: [], error: null }),
    upsert: async () => ({ data: [], error: null })
  })
};
```

- [ ] **Step 2: Run failing repository tests**

```powershell
npm.cmd run test -- src/services/cloudbase/cloudRepository.test.ts
```

Expected: fails because repository file does not exist.

- [ ] **Step 3: Implement repository**

Create `src/services/cloudbase/cloudRepository.ts` using the current implementation pattern in `src/services/cloudbase/cloudRepository.ts`.

Repository rules:

- `loadCloudState` selects only the five phase-one cloud tables: `profiles`, `goals`, `daily_records`, `timer_sessions`, `achievements`.
- Phase-one sync does not read or write remote language settings; UI language remains local-only in `ielts-dashboard-language`.
- `saveCloudState` uses the schema-owned conflict targets:

```ts
const conflictTargets = {
  profiles: "user_id",
  goals: "user_id",
  daily_records: "user_id,record_id",
  timer_sessions: "user_id,session_id",
  achievements: "user_id,achievement_id"
};
```

- [ ] **Step 4: Verify Task 5**

```powershell
npm.cmd run test -- src/services/cloudbase/cloudRepository.test.ts
npm.cmd run build
```

Expected: repository tests and build pass.

- [ ] **Step 5: Commit Task 5**

```powershell
git add src/services/cloudbase/cloudRepository.ts src/services/cloudbase/cloudRepository.test.ts
git commit -m "feat: add cloudbase repository"
```

---

### Task 6: Local-First Sync Manager

**Files:**
- Create: `src/services/sync/syncTypes.ts`
- Create: `src/services/sync/syncManager.ts`
- Create: `src/services/sync/syncManager.test.ts`
- Modify: `src/domain/types.ts`
- Modify: `src/services/storage/localStorageAdapter.ts`

**Interfaces:**
- Consumes:
  - `AppState`
  - `CloudRepository`
- Produces:
  - `SyncMode`
  - `SyncState`
  - `replaceAppStateUserId(state: AppState, userId: string): AppState`
  - `mergeAppStates(localState: AppState, cloudState: AppState): AppState`
  - `markAppStateSynced(state: AppState): AppState`
  - `createSyncManager(repository: CloudRepository): SyncManager`

- [ ] **Step 1: Extend sync types**

Modify `src/domain/types.ts`:

```ts
export type SyncStatus = "local-only" | "synced" | "pending" | "conflict" | "sync-error";
```

Add to `UserProfile`:

```ts
accountStatus?: "active" | "disabled" | "pending";
```

Modify `src/services/storage/localStorageAdapter.ts` validators so missing `accountStatus` remains valid for old local data and present values must be one of `active`, `disabled`, or `pending`.

- [ ] **Step 2: Write sync manager tests**

Create tests that verify:

- replacing local guest `userId` updates profile, goals, records, timer sessions, and achievements
- first login with no cloud state uploads local state
- first login with cloud state merges newer `updatedAt` records
- unlocked achievements preserve the earliest `unlockedAt`
- sync failure returns an error state without losing local state

Use `createDefaultAppState("2026-07-24T00:00:00.000Z")` and mutate fixture timestamps directly.

- [ ] **Step 3: Run failing sync tests**

```powershell
npm.cmd run test -- src/services/sync/syncManager.test.ts
```

Expected: fails because sync manager files do not exist.

- [ ] **Step 4: Implement sync types**

Create `src/services/sync/syncTypes.ts`:

```ts
import type { AppState } from "../storage/storageTypes";

export type SyncMode = "guest" | "syncing" | "synced" | "offline" | "error";

export interface SyncState {
  mode: SyncMode;
  message: string | null;
  lastSyncedAt: string | null;
}

export interface SyncResult {
  state: AppState;
  syncState: SyncState;
}
```

- [ ] **Step 5: Implement sync manager**

Create `src/services/sync/syncManager.ts` with these exports:

```ts
export function replaceAppStateUserId(state: AppState, userId: string): AppState;
export function mergeAppStates(localState: AppState, cloudState: AppState): AppState;
export function markAppStateSynced(state: AppState): AppState;
export function createSyncManager(repository: CloudRepository): SyncManager;
```

Merge rules:

- profile and goals: newer `updatedAt` wins
- records: key by active `date`; newer `updatedAt` wins
- timer sessions: key by `sessionId`; newer `updatedAt` wins
- achievements: key by `achievementId`; unlocked beats locked; if both unlocked, earlier `unlockedAt` wins

`createSyncManager(repository)` must expose:

```ts
export interface SyncManager {
  importOrLoad(userId: string, localState: AppState, accountName: string | null): Promise<SyncResult>;
  push(state: AppState, accountName: string | null): Promise<SyncResult>;
}
```

- [ ] **Step 6: Verify Task 6**

```powershell
npm.cmd run test -- src/services/sync/syncManager.test.ts
npm.cmd run test -- src/services/storage/localStorageAdapter.test.ts
npm.cmd run build
```

Expected: sync, storage, and build checks pass.

- [ ] **Step 7: Commit Task 6**

```powershell
git add src/domain/types.ts src/services/storage/localStorageAdapter.ts src/services/storage/localStorageAdapter.test.ts src/services/sync/syncTypes.ts src/services/sync/syncManager.ts src/services/sync/syncManager.test.ts
git commit -m "feat: add local first sync manager"
```

---

### Task 7: Auth Session Hook And Dashboard Data Integration

**Files:**
- Create: `src/hooks/useAuthSession.ts`
- Create: `src/hooks/useAuthSession.test.tsx`
- Modify: `src/hooks/useDashboardData.ts`
- Modify: `src/hooks/useDashboardData.test.tsx`
- Modify: `src/services/storage/storageTypes.ts`
- Modify: `src/services/storage/appRepository.ts`

**Interfaces:**
- Consumes:
  - `AuthService`
  - `SyncManager`
  - `AppRepository`
- Produces:
  - `useAuthSession(authService?: AuthService): AuthSession`
  - `DashboardData.syncState`
  - `DashboardData.syncNow(userId: string, accountName: string | null): Promise<void>`

- [ ] **Step 1: Write hook tests**

Create `src/hooks/useAuthSession.test.tsx` to verify:

- initial state is `loading`
- guest state after `getCurrentUser()` returns null
- authenticated state after service returns a user
- `startEmailSignUp`, `completeEmailSignUp`, `signIn`, and `signOut` update state
- service errors surface as `errorMessage`

- [ ] **Step 2: Run failing hook tests**

```powershell
npm.cmd run test -- src/hooks/useAuthSession.test.tsx
```

Expected: fails because `useAuthSession.ts` does not exist.

- [ ] **Step 3: Implement auth hook**

Create `src/hooks/useAuthSession.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  EmailSignUpChallenge,
  EmailSignUpCredentials,
  PasswordSignInCredentials,
  AuthService
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
```

Default service:

```ts
const defaultAuthService = () => createAuthService(createCloudBaseClient().auth);
```

Use `useEffect` to call `getCurrentUser()` and register `onAuthStateChanged`.

- [ ] **Step 4: Integrate dashboard sync**

Modify `src/hooks/useDashboardData.ts`:

- Add optional `syncManager?: SyncManager`.
- Add `syncState` to returned `DashboardData`.
- Keep every update local-first.
- Add `syncNow(userId, accountName)` that calls `syncManager.importOrLoad(...)` for first auth load and `syncManager.push(...)` for later local writes.
- Do not block `updateTodayRecord`, `updateDailyGoals`, or `addTimerSession` on network.

Modify tests to assert guest mode behavior is unchanged when no sync manager is passed.

- [ ] **Step 5: Verify Task 7**

```powershell
npm.cmd run test -- src/hooks/useAuthSession.test.tsx src/hooks/useDashboardData.test.tsx
npm.cmd run build
```

Expected: hook tests and build pass.

- [ ] **Step 6: Commit Task 7**

```powershell
git add src/hooks/useAuthSession.ts src/hooks/useAuthSession.test.tsx src/hooks/useDashboardData.ts src/hooks/useDashboardData.test.tsx src/services/storage/storageTypes.ts src/services/storage/appRepository.ts
git commit -m "feat: connect auth session to dashboard data"
```

---

### Task 8: Auth UI, Sync Status, And Translations

**Files:**
- Create: `src/components/auth/AuthPanel.tsx`
- Create: `src/components/auth/AuthPanel.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/AppShell.test.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/i18n/translations.ts`
- Modify: `src/App.test.tsx`
- Modify: `src/App.composition.test.tsx`

**Interfaces:**
- Consumes:
  - `AuthSession`
  - `SyncState`
- Produces:
  - `AuthPanel`
  - visible account/sync controls in shell/settings

- [ ] **Step 1: Extend translations**

Add to `I18nText`:

```ts
auth: {
  title: string;
  account: string;
  email: string;
  username: string;
  password: string;
  verificationCode: string;
  signIn: string;
  signUp: string;
  sendVerificationCode: string;
  completeSignUp: string;
  signOut: string;
  guest: string;
  signedInAs(accountName: string): string;
  validation: {
    accountHelp: string;
    emailHelp: string;
    usernameHelp: string;
    passwordHelp: string;
    codeHelp: string;
  };
};
sync: {
  guest: string;
  syncing: string;
  synced: string;
  offline: string;
  error: string;
  cloudbaseReady: string;
};
```

Add complete English and Chinese strings. No visible text may be hard-coded in components.

- [ ] **Step 2: Write AuthPanel tests**

Create tests that verify:

- renders email, optional username, password, and verification-code inputs where relevant
- rejects invalid email, username, password, or verification code before calling submit
- calls `onSignIn` for sign in
- calls `onStartEmailSignUp` to request a verification code
- calls `onCompleteEmailSignUp` to complete sign up
- shows signed-in account and logout button

- [ ] **Step 3: Implement AuthPanel**

Create `src/components/auth/AuthPanel.tsx` with props:

```ts
interface AuthPanelProps {
  status: "loading" | "guest" | "authenticated" | "error";
  accountName: string | null;
  pendingSignUpEmail: string | null;
  errorMessage: string | null;
  onSignIn(credentials: PasswordSignInCredentials): Promise<void>;
  onStartEmailSignUp(credentials: EmailSignUpCredentials): Promise<void>;
  onCompleteEmailSignUp(verificationCode: string): Promise<void>;
  onSignOut(): Promise<void>;
}
```

Use existing button/input visual patterns. Keep controls compact and mobile-safe.

- [ ] **Step 4: Wire App and layout**

Modify `src/App.tsx`:

- Create CloudBase client only when env config exists.
- Use `useAuthSession`.
- Create `createCloudRepository(client.rdb())`.
- Create `createSyncManager(repository)`.
- Pass auth and sync state into `AppShell`.

Modify `AppShell`:

- Render `AuthPanel` in a compact right/top area.
- Keep navigation stable on 390px mobile viewport.

Modify `SettingsPage`:

- Show CloudBase mode, local key, and sync status.

- [ ] **Step 5: Verify Task 8**

```powershell
npm.cmd run test -- src/components/auth/AuthPanel.test.tsx src/components/layout/AppShell.test.tsx src/App.test.tsx src/App.composition.test.tsx
npm.cmd run build
```

Expected: auth UI, app, and build checks pass.

- [ ] **Step 6: Commit Task 8**

```powershell
git add src/components/auth/AuthPanel.tsx src/components/auth/AuthPanel.test.tsx src/App.tsx src/components/layout/AppShell.tsx src/components/layout/AppShell.test.tsx src/pages/SettingsPage.tsx src/i18n/translations.ts src/App.test.tsx src/App.composition.test.tsx
git commit -m "feat: add auth and sync UI"
```

---

### Task 9: Cleanup, E2E, Docs, And GitHub Push

**Files:**
- Create: `scripts/find-runtime-unused.mjs`
- Modify: `tests/e2e/dashboard.spec.ts`
- Modify: `tests/e2e/scaffold.smoke.spec.ts`
- Modify: `README.md`
- Modify: `.gitignore` if `.env.local` is not already ignored
- Delete: only source files proven unreachable by `scripts/find-runtime-unused.mjs` and confirmed unrelated to tests

**Interfaces:**
- Produces:
  - runtime unused-source check
  - final manual verification checklist
  - updated README setup instructions

- [ ] **Step 1: Add runtime unused-source checker**

Create `scripts/find-runtime-unused.mjs` using the same entry graph approach already used during manual inspection:

```js
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "src");
const all = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    if (/\.(ts|tsx)$/.test(entry.name)) all.push(fullPath);
  }
}

walk(src);

const runtime = all.filter(
  (filePath) =>
    !/\.test\.(ts|tsx)$/.test(filePath) &&
    !filePath.includes(`${path.sep}test${path.sep}`) &&
    !filePath.endsWith("vite-env.d.ts")
);
const runtimeSet = new Set(runtime);
const extensions = [".ts", ".tsx", ".js", ".jsx"];

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    ...extensions.map((extension) => base + extension),
    path.join(base, "index.ts"),
    path.join(base, "index.tsx")
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

const importPattern =
  /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|export\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
const graph = new Map();

for (const filePath of runtime) {
  const text = readFileSync(filePath, "utf8");
  const dependencies = [];
  let match;
  while ((match = importPattern.exec(text))) {
    const resolved = resolveImport(filePath, match[1] || match[2]);
    if (resolved && runtimeSet.has(resolved)) dependencies.push(resolved);
  }
  graph.set(filePath, dependencies);
}

const seen = new Set();
function visit(filePath) {
  if (seen.has(filePath)) return;
  seen.add(filePath);
  for (const dependency of graph.get(filePath) ?? []) visit(dependency);
}

visit(path.join(src, "main.tsx"));

const unused = runtime.filter((filePath) => !seen.has(filePath));
if (unused.length === 0) {
  console.log("NO_RUNTIME_UNUSED_SOURCE_FILES");
} else {
  console.log(unused.map((filePath) => path.relative(root, filePath)).join("\n"));
  process.exit(1);
}
```

Add script:

```json
"verify:unused-runtime": "node ./scripts/find-runtime-unused.mjs"
```

- [ ] **Step 2: Update e2e tests**

Add Playwright coverage for:

- auth panel opens on desktop and mobile
- invalid email/username/password/verification-code values show validation text
- guest mode still allows check-in, timer, settings, and language toggle
- no horizontal overflow on 1440x900 and 390x844

Do not put real CloudBase credentials in Playwright tests.

- [ ] **Step 3: Update README**

Document:

- CloudBase PG is chosen because RMB payment is required.
- CloudBase console setup: PG mode, email verification registration, username/password login, publishable key, security origins, RLS SQL.
- `.env.local` example using fake non-secret values only.
- Local-first behavior.
- Manual verification with two test accounts.
- Secret safety rules.

- [ ] **Step 4: Run full verification**

Run:

```powershell
npm.cmd run verify:cloudbase-sql
npm.cmd run verify:unused-runtime
.\node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit --noUnusedLocals --noUnusedParameters
.\node_modules\.bin\tsc.cmd -p tsconfig.node.json --noEmit --noUnusedLocals --noUnusedParameters
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

Expected:

- SQL verification passes.
- Runtime unused check prints `NO_RUNTIME_UNUSED_SOURCE_FILES`.
- Strict TypeScript checks pass.
- Unit tests pass.
- Build passes.
- E2E passes on desktop and mobile projects.

- [ ] **Step 5: Manual CloudBase verification**

Use a real CloudBase PG environment with throwaway test accounts.

Check:

- CloudBase plan page shows RMB pricing.
- User A can register, log in, and sync data.
- User B can register, log in, and cannot read User A records.
- User B cannot insert or update rows with User A `user_id`.
- User A local data imports on first login.
- Refresh restores User A cloud data.
- Second browser session loads User A cloud data after login.
- Turning network off preserves local changes and shows error/offline sync state.
- Logging out returns to guest/local mode without deleting local data.

- [ ] **Step 6: Browser visual check**

Start the local dev server:

```powershell
npm.cmd run dev -- --port 5185
```

Open:

```text
http://127.0.0.1:5185/
```

Check desktop 1440x900:

- no obvious text overlap
- no button overflow
- auth panel does not cover navigation
- console has no application errors

Check mobile 390x844:

- navigation remains usable
- auth panel fits
- check-in controls fit
- timer controls fit
- no horizontal body overflow

- [ ] **Step 7: Commit Task 9**

```powershell
git add scripts/find-runtime-unused.mjs package.json tests/e2e/dashboard.spec.ts tests/e2e/scaffold.smoke.spec.ts README.md .gitignore
git add src
git add cloudbase
git commit -m "feat: complete cloudbase sync auth"
```

Before running `git add src`, inspect `git status --short` and confirm every changed source file belongs to this CloudBase sync/auth implementation.

- [ ] **Step 8: Push to GitHub**

```powershell
git status -sb
git push -u origin feature/ielts-dashboard
git ls-remote origin feature/ielts-dashboard
git rev-parse HEAD
```

Expected:

- local branch is clean after commit
- remote branch hash equals local `HEAD`

---

## Self-Review

Spec coverage:

- CloudBase PG and RMB payment: Task 1, Task 3, Task 9.
- Account/password registration and login: Task 2, Task 7, Task 8.
- Guest mode: Task 6, Task 7, Task 9.
- Local-to-cloud import: Task 6, Task 7, Task 9.
- Cloud sync for goals, records, timer sessions, achievements: Task 4, Task 5, Task 6.
- RLS isolation: Task 3 and Task 9.
- Chinese/English visible text: Task 8.
- Desktop/mobile checks: Task 9.
- Old unused code cleanup: Task 9.
- GitHub push: Task 9.

Placeholder scan:

- The plan intentionally contains no open incomplete-work markers. The only conditional stop is the CloudBase PG SQL console compatibility gate, which has an exact fallback action: replace rejected auth references with the current CloudBase documented equivalent and keep the ownership-policy shape.

Type consistency:

- `CloudBaseAuthUser`, `AuthService`, `CloudRepository`, `SyncManager`, `SyncState`, and `DashboardData.syncState` are named before later tasks consume them.
- Account naming uses `accountName` in frontend/domain code and `account_name` in PG rows.
- CloudBase PG rows use snake_case; app domain types stay camelCase.
