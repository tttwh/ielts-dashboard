-- Align an existing test CloudBase PG schema with the final phase-one schema.
--
-- Use this only if you previously executed an older SQL draft in CloudBase.
-- For a brand-new CloudBase PG environment, skip this migration and run:
--   cloudbase/sql/cloud-sync-auth.sql
--
-- Required order for an existing test environment:
--   1. Back up or export the existing CloudBase PG data.
--   2. Run this migration.
--   3. Run cloudbase/sql/cloud-sync-auth.sql again to recreate policies,
--      triggers, indexes, and RLS settings.
--
-- This migration intentionally removes public.user_settings because phase one
-- keeps UI language in the local ielts-dashboard-language key.

begin;

create extension if not exists pgcrypto;

drop table if exists public.user_settings;

do $$
begin
  if to_regclass('public.goals') is not null and exists (
    select 1
    from public.goals
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'goals has multiple rows for one user_id; deduplicate manually before this migration';
  end if;
end;
$$;

alter table if exists public.goals
  drop constraint if exists goals_pkey;

alter table if exists public.goals
  drop column if exists goal_id;

alter table if exists public.goals
  alter column user_id type varchar(64) using user_id::text,
  alter column user_id set not null,
  alter column user_id set default auth.uid();

alter table if exists public.goals
  add primary key (user_id);

alter table if exists public.daily_records
  drop constraint if exists daily_records_pkey;

alter table if exists public.daily_records
  alter column user_id type varchar(64) using user_id::text,
  alter column user_id set not null,
  alter column user_id set default auth.uid(),
  alter column record_id type text using record_id::text,
  alter column record_id set not null;

alter table if exists public.daily_records
  add primary key (user_id, record_id);

alter table if exists public.timer_sessions
  drop constraint if exists timer_sessions_pkey;

alter table if exists public.timer_sessions
  alter column user_id type varchar(64) using user_id::text,
  alter column user_id set not null,
  alter column user_id set default auth.uid(),
  alter column session_id type text using session_id::text,
  alter column session_id set not null;

alter table if exists public.timer_sessions
  add primary key (user_id, session_id);

alter table if exists public.achievements
  drop constraint if exists achievements_pkey;

alter table if exists public.achievements
  alter column user_id type varchar(64) using user_id::text,
  alter column user_id set not null,
  alter column user_id set default auth.uid(),
  alter column achievement_id type text using achievement_id::text,
  alter column achievement_id set not null;

alter table if exists public.achievements
  add primary key (user_id, achievement_id);

commit;
