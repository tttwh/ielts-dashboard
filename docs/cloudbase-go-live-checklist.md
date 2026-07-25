# CloudBase PG Go-Live Checklist

Use this checklist when you are ready to turn on real cloud sync and user registration.

## 1. Buy The Right Service

- Choose Tencent Cloud CloudBase.
- Create a CloudBase environment in PostgreSQL / PG mode.
- Confirm the billing page shows RMB / yuan pricing before you buy.
- Do not buy Aliyun for phase one unless you decide to replace the current CloudBase adapter with a custom backend.

## 2. Configure CloudBase Console

- Enable email verification registration.
- Enable username/password login.
- Generate one Web SDK Publishable Key.
- Add security origins:
  - `http://127.0.0.1:5173`
  - `http://127.0.0.1:5185`
  - your deployed GitHub Pages / hosting URL when you have one
- Keep region as `ap-shanghai` unless the CloudBase environment uses another region.

## 3. Apply SQL

For a fresh CloudBase PG environment, run only:

```text
cloudbase/sql/cloud-sync-auth.sql
```

For an environment where you already ran an older SQL draft:

```text
cloudbase/sql/migrations/2026-07-25-align-final-schema.sql
cloudbase/sql/cloud-sync-auth.sql
```

The migration comes first because `create table if not exists` will not reshape old primary keys or old column types.

## 4. Create Local Env

Create `.env.local` on your own machine only:

```dotenv
VITE_CLOUDBASE_ENV_ID=<your-env-id>
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_ACCESS_KEY=<your-web-publishable-key>
```

Never commit `.env.local`, Tencent SecretId, Tencent SecretKey, manager credentials, service tokens, or real test account passwords.

Run the local env guard after filling real values:

```powershell
npm.cmd run verify:cloudbase-env
```

The guard only allows `VITE_CLOUDBASE_ENV_ID`, `VITE_CLOUDBASE_REGION`, and `VITE_CLOUDBASE_ACCESS_KEY`.

## 5. Local Verification Commands

Windows:

```powershell
npm.cmd run verify:cloudbase-env
npm.cmd run verify:cloudbase-sql
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run dev -- --port 5185
```

macOS:

```bash
npm run verify:cloudbase-env
npm run verify:cloudbase-sql
npm run test
npm run build
npm run test:e2e
npm run dev -- --port 5185
```

Open:

```text
http://127.0.0.1:5185/
```

## 6. Manual Two-Account Verification

Use two throwaway accounts. Do not use your real personal password.

| Case | Action | Expected result |
| --- | --- | --- |
| A register | Register account A with email verification | A can sign in and reaches synced/authenticated mode |
| A session | Refresh after A signs in and inspect auth state | App remains authenticated only when CloudBase returns a real `data.session` |
| A import | Create guest records before A signs in | A imports guest data into A cloud rows |
| A refresh | Refresh after A syncs | A data restores |
| A second session | Log into A in another browser profile | A cloud data loads |
| B isolation | Register and log into B | B cannot see A goals, daily records, timer sessions, or achievements |
| Anonymous block | Run an unauthenticated read/write check | `anon` has no table-level access to app tables |
| RLS insert block | Try to insert/update a row with B auth but A `user_id` | CloudBase PG rejects it |
| Offline safety | Disable network during an edit | Local data stays visible and sync status shows offline/error |
| Logout safety | Sign out | App returns to guest mode without deleting A or guest cache |

Do not report real CloudBase verification as passed until each row has direct evidence: screenshot, console output, or SQL/RLS result.

Do not treat a returned `user` object alone as proof of login. Cloud sync is valid only when CloudBase `getSession()` returns both a user and a non-empty session.

## 7. SQL Shape Checks

After running SQL, confirm these shapes in CloudBase PG:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Expected app tables:

```text
achievements
daily_records
goals
profiles
timer_sessions
```

There should be no current `user_settings` table for phase one.

Check key columns:

```sql
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'goals', 'daily_records', 'timer_sessions', 'achievements')
  and column_name in ('user_id', 'record_id', 'session_id', 'achievement_id')
order by table_name, column_name;
```

Expected:

- user-owned `user_id` columns use `varchar(64)` and default to `auth.uid()` where inserts need it.
- `daily_records` uses primary key `(user_id, record_id)`.
- `timer_sessions.session_id` is `text`.
- `anon` has no table-level access to app tables.
- `authenticated` has only `select`, `insert`, and `update` table-level access to app tables.
- RLS is enabled on every app table and still filters every row by `auth.uid()`.

## 8. Current Known Gaps

- Real CloudBase PG verification is still external until you create the environment and test accounts.
- Existing deployed test tables may need the migration file above.
- The production build currently emits a large chunk warning; it does not block local functionality, but code-splitting should be considered before a public launch.
