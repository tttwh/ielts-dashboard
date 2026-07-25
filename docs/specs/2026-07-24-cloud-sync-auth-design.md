# IELTS Dashboard Cloud Sync And Auth Design

## Decision

Use Tencent Cloud CloudBase PG mode as the phase-one backend for user registration, login, and cloud sync. Keep the app local-first so it remains usable without login or during network failure.

This replaces the previous Supabase direction because the project now requires a service that can be paid in RMB. Supabase invoices are USD and credit-card based, while CloudBase is RMB-priced and provides authentication, PostgreSQL access, and SQL/RLS-style data isolation.

Registration starts open for early testing. The data model must still support later access tightening through a user profile status field, so the project can move to whitelist or invite-only access without rewriting the sync layer.

Aliyun is not needed for this phase. Revisit Aliyun only when the project needs a self-hosted API, domestic domain and ICP-related deployment work, object storage outside CloudBase, or tighter infrastructure control.

## Goals

- Add email verification registration, password login, logout, and session restore.
- Preserve guest mode with the existing LocalStorage data.
- Import existing local data into the authenticated user's cloud account after first login.
- Sync targets, daily records, timer sessions, and achievements across devices.
- Show clear sync state in the UI: guest, syncing, synced, offline, and error.
- Keep every user's data isolated with CloudBase PG Row Level Security.
- Use an RMB-priced backend service.
- Preserve the current multi-page liquid-glass IELTS dashboard UI direction.
- Remove first-version code that becomes unused after the auth and sync refactor.
- Push the finished implementation to the GitHub remote after verification.

## Non-Goals

- No Aliyun backend in phase one.
- No phone login.
- No OAuth providers.
- No administrator dashboard.
- No multi-user sharing or collaboration.
- No automatic reading of other apps' screen-time data.
- No payment, subscription, or public production launch workflow in this app.

## Architecture

The app will have three layers:

1. UI layer: React pages and components for auth state, sync status, account controls, settings, and current dashboard features.
2. Application data layer: a local-first dashboard hook that writes immediately to local state and LocalStorage, then queues or triggers cloud sync when the user is authenticated.
3. Backend adapter layer: CloudBase client, auth service, cloud repository, SQL schema, and mapping functions between domain objects and database rows.

Existing synchronous storage should not be replaced by direct CloudBase calls inside UI components. The current repository abstraction must evolve into an async-capable local-first repository or a separate sync manager. UI actions should continue to feel instant, while cloud writes happen through a controlled sync path.

## CloudBase Setup

Use CloudBase PG mode, not traditional document-database mode.

Required CloudBase console setup:

- Create a CloudBase environment in PG mode.
- Enable email verification registration and username/password login according to CloudBase's current auth configuration.
- Generate a Publishable Key for Web SDK access.
- Add local development and deployment origins to the CloudBase security source list.
- Configure the environment region, expected first choice `ap-shanghai`.
- Keep CloudBase billing in RMB-priced plans.

Frontend environment variables:

- `VITE_CLOUDBASE_ENV_ID`
- `VITE_CLOUDBASE_REGION`
- `VITE_CLOUDBASE_ACCESS_KEY`

No Tencent SecretId, SecretKey, admin token, service role key, or manager credential may be committed to frontend code, `.env.example`, README examples, tests, screenshots, or logs.

## Auth Flow

Use CloudBase JS SDK v3 through `@cloudbase/js-sdk`. The MVP uses email verification registration because CloudBase's current v3 guidance does not support direct pure username plus password sign-up. During registration, the user enters email, password, optional username, and then a verification code sent by CloudBase. After registration, login uses `signInWithPassword` with email or username plus password.

- Guest user opens the app and can use all local dashboard features.
- User clicks account or sync control and opens an auth panel.
- User starts registration with email, password, and optional username.
- User completes registration by entering the CloudBase email verification code.
- User logs in with email or username plus password.
- App restores CloudBase session on refresh through the CloudBase client.
- User can log out; cloud data remains remote, local cache remains available.

For phase one, registration is open. A `profiles.status` value still exists from day one:

- `active`: user can sync normally.
- `disabled`: user can authenticate but sync operations are blocked in the app.
- `pending`: reserved for a future whitelist or invite flow.

The first phase sets every new profile to `active`. Later tightening can change the trigger or onboarding flow without changing dashboard tables.

## Data Model

Use normalized PostgreSQL tables instead of one JSON blob because the app already has distinct domain entities and needs future analytics.

All user-owned tables use `user_id varchar(64) not null default auth.uid()`. CloudBase PG documents `auth.users.id` as `varchar(64)` and `auth.uid()` as text extracted from the JWT `sub` claim, so frontend and database code must treat CloudBase user ids as strings rather than UUIDs.

### profiles

- `user_id varchar(64) primary key references auth.users(id)`
- `account_name text`
- `email text`
- `status text not null default 'active'`
- `display_name text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### user_settings

- `user_id varchar(64) primary key references auth.users(id)`
- `language text not null default 'zh-CN'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### goals

- `goal_id uuid primary key`
- `user_id varchar(64) not null references auth.users(id)`
- `overall_band numeric not null`
- `listening_band numeric not null`
- `speaking_band numeric not null`
- `reading_band numeric not null`
- `writing_band numeric not null`
- `words_target integer not null`
- `speaking_topics_target integer not null`
- `listening_tests_target integer not null`
- `corpus_minutes_target integer not null`
- `section_minutes_target jsonb not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

### daily_records

- `record_id text not null`
- `user_id varchar(64) not null default auth.uid() references auth.users(id)`
- `record_date date not null`
- `words_memorized integer not null`
- `speaking_topics integer not null`
- `listening_tests integer not null`
- `corpus_minutes integer not null`
- `section_minutes jsonb not null`
- `reading_overtime_minutes integer not null`
- `completion_rate numeric not null`
- `is_all_clear boolean not null`
- `xp_earned integer not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`
- `primary key (user_id, record_id)`

Add a unique index on `(user_id, record_date)` for active records.

### timer_sessions

- `session_id text primary key`
- `user_id varchar(64) not null default auth.uid() references auth.users(id)`
- `record_date date not null`
- `section text not null`
- `source text not null`
- `planned_minutes integer not null`
- `actual_minutes integer not null`
- `overtime_minutes integer not null`
- `started_at timestamptz not null`
- `ended_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

### achievements

- `achievement_id text not null`
- `user_id varchar(64) not null references auth.users(id)`
- `name text not null`
- `description text not null`
- `category text not null`
- `unlocked_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Primary key: `(user_id, achievement_id)`.

## RLS And Security

Every public app table must enable Row Level Security.

Policies must use CloudBase PG's authenticated role model and an ownership predicate:

- Select: user can read rows where the row `user_id` equals the current authenticated user id.
- Insert: user can insert rows only where the row `user_id` equals the current authenticated user id.
- Update: user can update rows where the row `user_id` equals the current authenticated user id, and `WITH CHECK` must also require the same ownership.
- Delete: prefer soft delete from the client. Hard delete policies may be added only for owned rows.

The implementation must verify the exact CloudBase PG role names and auth UID expression against current CloudBase docs before writing SQL. The intended policy shape follows CloudBase PG's documented pattern:

```sql
alter table my_table enable row level security;

create policy select_own on my_table
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy insert_own on my_table
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy update_own on my_table
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

Frontend code must use only CloudBase Web SDK publishable configuration. Manager SDK credentials and Tencent Cloud SecretId/SecretKey belong only in CloudBase console, CLI, or server-side environments, never in the Vite app.

## Sync Rules

The app remains local-first.

### Guest Mode

- Use existing LocalStorage behavior.
- Show status as local-only.
- Do not block dashboard features.

### First Login Import

When a user logs in and has local data:

1. Load local app state.
2. Load cloud state for the authenticated user.
3. If cloud state is empty, upload local state after replacing local guest `userId` with the CloudBase authenticated user id.
4. If cloud state already exists, merge by entity key and `updatedAt`.
5. Save the merged state locally and remotely.

### Normal Sync

- UI changes update React state and LocalStorage immediately.
- Changed entities are marked with a local dirty state.
- A sync manager pushes dirty entities when authenticated and online.
- Successful cloud writes mark entities synced.
- Failed cloud writes preserve local data and show an error state.

### Conflict Resolution

For phase one, use last-write-wins by `updatedAt`.

Rules:

- Same daily record date: newer `updatedAt` wins per record.
- Same timer session id: newer `updatedAt` wins.
- Same achievement id: unlocked achievement wins over locked state; if both unlocked, earlier `unlockedAt` is preserved.
- Goals: newer `updatedAt` wins.

This is acceptable because the expected usage is one owner and a small number of personal devices. If heavy multi-device editing appears later, move to per-field merge or operation logs.

## UI Changes

Add account and sync controls without turning the dashboard into a marketing page.

- Add a compact account control in the app shell or settings page.
- Show current mode: guest, signed in, syncing, synced, offline, or error.
- Add auth panel with sign in, email sign up, verification code, password validation, and error messages.
- Add logout action.
- Add local-to-cloud import messaging after first login.
- Add settings copy that explains local-only mode versus CloudBase cloud sync.
- Keep existing Chinese/English toggle and add translations for all new visible text.

Mobile and desktop layouts must be checked. Auth controls must not overlap navigation, timer controls, or dashboard cards.

## Files Expected To Change During Implementation

Create:

- `src/services/cloudbase/cloudbaseClient.ts`
- `src/services/cloudbase/authService.ts`
- `src/services/cloudbase/cloudRepository.ts`
- `src/services/cloudbase/cloudMappers.ts`
- `src/services/sync/syncTypes.ts`
- `src/services/sync/syncManager.ts`
- `src/hooks/useAuthSession.ts`
- `src/components/auth/AuthPanel.tsx`
- `src/components/auth/AuthPanel.test.tsx`
- `cloudbase/sql/cloud-sync-auth.sql`
- `.env.example`

Modify:

- `package.json`
- `package-lock.json`
- `src/services/storage/storageTypes.ts`
- `src/services/storage/appRepository.ts`
- `src/hooks/useDashboardData.ts`
- `src/domain/types.ts`
- `src/App.tsx`
- `src/components/layout/AppShell.tsx`
- `src/pages/SettingsPage.tsx`
- `src/i18n/translations.ts`
- relevant unit tests and Playwright tests
- `README.md`

Remove only after import checks prove they are unused:

- first-version components superseded by page-level replacements
- stale test doubles that reference deleted components
- obsolete docs or examples that describe the app as local-only without cloud-sync caveat
- old screenshots, logs, or generated artifacts outside tracked source if they are not needed

## Testing And Verification

Before commit:

- Run unit tests: `npm.cmd run test`
- Run build: `npm.cmd run build`
- Run e2e tests: `npm.cmd run test:e2e`
- Run strict TypeScript unused checks with local `tsc.cmd`.
- Start local dev server.
- Check desktop viewport.
- Check mobile viewport.
- Check browser console for errors.
- Manually verify:
  - guest mode still works
  - email sign-up form validation and verification-code step work with a configured CloudBase environment
  - login works with configured CloudBase PG environment
  - logout works
  - local data imports after first login
  - data survives refresh
  - second browser/device session can load cloud data
  - offline or failed sync does not lose local changes

CloudBase verification:

- Confirm the CloudBase environment uses PG mode.
- Confirm the selected CloudBase plan is RMB-priced.
- Confirm all public app tables have RLS enabled.
- Confirm users cannot read another user's records.
- Confirm users cannot insert or update rows for another `user_id`.
- Confirm no SecretId, SecretKey, manager credential, or service token appears in committed files.

GitHub verification:

- Confirm working tree contains only intended changes.
- Commit with a focused message.
- Push the current branch to `origin`.
- Confirm remote branch contains the pushed commit.

## Acceptance Criteria

- A new user can register with email verification and password.
- An existing user can log in and out.
- A guest can use the dashboard without an account.
- Logged-in user data syncs to CloudBase PG and restores after refresh.
- A second authenticated session can load the same user's dashboard data.
- Local data is not lost during first login import.
- RLS prevents cross-user data access.
- UI displays sync/auth state clearly in Chinese and English.
- Backend service can be paid in RMB.
- Desktop and mobile layouts have no obvious text overlap, button overflow, or navigation breakage.
- Build, unit tests, and e2e tests pass.
- First-version unused code is removed based on evidence, not guesswork.
- Final implementation is committed and pushed to GitHub.

## References

- CloudBase pricing: https://cloud.tencent.cn/document/product/876/75213
- CloudBase JS SDK v3 authentication: https://docs.cloudbase.net/api-reference/webv3/authentication
- CloudBase account password login: https://docs.cloudbase.net/authentication-v2/method/username-login
- CloudBase PG auth: https://docs.cloudbase.net/authentication-v2/auth/auth-pg
- CloudBase PG RLS permissions: https://docs.cloudbase.net/database/configuration/db/postgresql/data-permission
- CloudBase PG quickstart: https://docs.cloudbase.net/database/configuration/db/postgresql/quickstart
- CloudBase PG Web RDB fetch: https://docs.cloudbase.net/api-reference/webv2/postgresql/fetch
