create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id varchar(64) primary key default auth.uid() references auth.users(id),
  account_name text,
  email text,
  status text not null default 'active' check (status in ('active', 'disabled', 'pending')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  user_id varchar(64) primary key default auth.uid() references auth.users(id),
  overall_band numeric not null,
  listening_band numeric not null,
  speaking_band numeric not null,
  reading_band numeric not null,
  writing_band numeric not null,
  words_target integer not null,
  speaking_topics_target integer not null,
  listening_tests_target integer not null,
  corpus_minutes_target integer not null,
  section_minutes_target jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.daily_records (
  record_id text not null,
  user_id varchar(64) not null default auth.uid() references auth.users(id),
  record_date date not null,
  words_memorized integer not null,
  speaking_topics integer not null,
  listening_tests integer not null,
  corpus_minutes integer not null,
  section_minutes jsonb not null,
  reading_overtime_minutes integer not null,
  completion_rate numeric not null,
  is_all_clear boolean not null,
  xp_earned integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, record_id)
);

create table if not exists public.timer_sessions (
  session_id text not null,
  user_id varchar(64) not null default auth.uid() references auth.users(id),
  record_date date not null,
  section text not null check (section in ('listening', 'speaking', 'reading', 'writing')),
  source text not null check (source in ('in-app-timer', 'manual-external')),
  planned_minutes integer not null,
  actual_minutes integer not null,
  overtime_minutes integer not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, session_id)
);

create table if not exists public.achievements (
  achievement_id text not null,
  user_id varchar(64) not null default auth.uid() references auth.users(id),
  name text not null,
  description text not null,
  category text not null check (category in ('streak', 'skill', 'milestone', 'balance')),
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, achievement_id)
);

create unique index if not exists daily_records_user_date_active_idx
  on public.daily_records (user_id, record_date)
  where deleted_at is null;

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.daily_records enable row level security;
alter table public.timer_sessions enable row level security;
alter table public.achievements enable row level security;

revoke all on public.profiles from anon;
revoke all on public.goals from anon;
revoke all on public.daily_records from anon;
revoke all on public.timer_sessions from anon;
revoke all on public.achievements from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.goals to authenticated;
grant select, insert, update on public.daily_records to authenticated;
grant select, insert, update on public.timer_sessions to authenticated;
grant select, insert, update on public.achievements to authenticated;

create or replace function public.prevent_profile_status_update_by_authenticated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and new.status is distinct from old.status then
    raise exception 'profile status is managed by server';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_status_update_guard on public.profiles;
create trigger profiles_status_update_guard
  before update on public.profiles
  for each row
  execute function public.prevent_profile_status_update_by_authenticated();

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists goals_select_own on public.goals;
drop policy if exists goals_insert_own on public.goals;
drop policy if exists goals_update_own on public.goals;
drop policy if exists daily_records_select_own on public.daily_records;
drop policy if exists daily_records_insert_own on public.daily_records;
drop policy if exists daily_records_update_own on public.daily_records;
drop policy if exists timer_sessions_select_own on public.timer_sessions;
drop policy if exists timer_sessions_insert_own on public.timer_sessions;
drop policy if exists timer_sessions_update_own on public.timer_sessions;
drop policy if exists achievements_select_own on public.achievements;
drop policy if exists achievements_insert_own on public.achievements;
drop policy if exists achievements_update_own on public.achievements;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'active');
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy goals_select_own on public.goals
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy goals_insert_own on public.goals
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy goals_update_own on public.goals
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy daily_records_select_own on public.daily_records
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy daily_records_insert_own on public.daily_records
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy daily_records_update_own on public.daily_records
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy timer_sessions_select_own on public.timer_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy timer_sessions_insert_own on public.timer_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy timer_sessions_update_own on public.timer_sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy achievements_select_own on public.achievements
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy achievements_insert_own on public.achievements
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy achievements_update_own on public.achievements
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
