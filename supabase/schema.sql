-- One Coffee Per Day! database schema.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- It is safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  location text not null default '',
  school text not null default '',
  degree text not null default '',
  field_of_study text not null default '',
  graduation_year text not null default '',
  current_status text not null default '',
  current_title text not null default '',
  current_company text not null default '',
  headline text not null default '',
  skills text[] not null default '{}',
  experiences jsonb not null default '[]',
  background_summary text not null default '',
  target_industries text[] not null default '{}',
  target_roles text[] not null default '{}',
  target_companies text[] not null default '{}',
  target_locations text[] not null default '{}',
  career_goal text not null default '',
  chat_goals text[] not null default '{}',
  linkedin_premium boolean not null default false,
  weekly_outreach_goal int not null default 5,
  monthly_chat_goal int not null default 2,
  onboarded boolean not null default false,
  nps_prompted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  batch_id uuid not null,
  full_name text not null,
  headline text not null default '',
  company text not null default '',
  location text not null default '',
  linkedin_url text not null,
  why text not null default '',
  shared_ground text[] not null default '{}',
  conversation_hook text not null default '',
  match_score int not null default 0,
  status text not null default 'new' check (status in ('new', 'selected', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (user_id, linkedin_url)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  suggestion_id uuid references public.suggestions (id) on delete set null,
  full_name text not null,
  headline text not null default '',
  company text not null default '',
  location text not null default '',
  linkedin_url text not null default '',
  why text not null default '',
  shared_ground text[] not null default '{}',
  conversation_hook text not null default '',
  source text not null default 'ai' check (source in ('ai', 'manual')),
  status text not null default 'to_reach_out'
    check (status in ('to_reach_out', 'reached_out', 'accepted', 'completed', 'no_response', 'declined')),
  message_draft text not null default '',
  chat_date timestamptz,
  notes text not null default '',
  research jsonb,
  reached_out_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Product analytics: one row per tracked user action.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- NPS answers and "I want this" clicks on features that don't exist yet.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('nps', 'waitlist')),
  score int check (score between 0 and 10),
  comment text not null default '',
  context text not null default '',
  created_at timestamptz not null default now()
);

-- Emails allowed to open the Insights (product metrics) page.
-- Add yourself with:  insert into public.admins (email) values ('you@example.com');
create table if not exists public.admins (
  email text primary key
);

create index if not exists suggestions_user_idx on public.suggestions (user_id, status);
create index if not exists contacts_user_idx on public.contacts (user_id, status);
create index if not exists events_user_name_idx on public.events (user_id, name, created_at);
create index if not exists events_created_idx on public.events (created_at);

-- ---------------------------------------------------------------------------
-- Row level security: every user only ever sees their own rows.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.suggestions enable row level security;
alter table public.contacts enable row level security;
alter table public.events enable row level security;
alter table public.feedback enable row level security;
alter table public.admins enable row level security; -- no policies: not readable through the API

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own suggestions" on public.suggestions;
create policy "own suggestions" on public.suggestions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own contacts" on public.contacts;
create policy "own contacts" on public.contacts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "read own events" on public.events;
create policy "read own events" on public.events
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "insert own events" on public.events;
create policy "insert own events" on public.events
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "read own feedback" on public.feedback;
create policy "read own feedback" on public.feedback
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "insert own feedback" on public.feedback;
create policy "insert own feedback" on public.feedback
  for insert to authenticated with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create an empty profile as soon as someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  insert into public.events (user_id, name) values (new.id, 'signed_up');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Stamp funnel timestamps when a contact moves through the pipeline.
-- These drive the North Star metric (accepted coffee chats) and acceptance rate.
create or replace function public.stamp_contact_status()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status in ('reached_out', 'accepted', 'completed', 'no_response', 'declined')
       and new.reached_out_at is null then
      new.reached_out_at = now();
    end if;
    if new.status in ('accepted', 'completed') and new.accepted_at is null then
      new.accepted_at = now();
    end if;
    if new.status = 'completed' and new.completed_at is null then
      new.completed_at = now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists contacts_stamp on public.contacts;
create trigger contacts_stamp before insert or update on public.contacts
  for each row execute function public.stamp_contact_status();

-- ---------------------------------------------------------------------------
-- Product metrics (aggregates only, admins only)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

create or replace function public.product_metrics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'users_total', (select count(*) from profiles),
    'users_onboarded', (select count(*) from profiles where onboarded),
    'wau', (select count(distinct user_id) from events where created_at > now() - interval '7 days'),
    'mau', (select count(distinct user_id) from events where created_at > now() - interval '30 days'),
    'suggestions_total', (select count(*) from suggestions),
    'contacts_total', (select count(*) from contacts),
    'reached_out_total', (select count(*) from contacts where reached_out_at is not null),
    'accepted_total', (select count(*) from contacts where accepted_at is not null),
    'completed_total', (select count(*) from contacts where completed_at is not null),
    'accepted_7d', (select count(*) from contacts where accepted_at > now() - interval '7 days'),
    'accepted_prev_7d', (select count(*) from contacts
       where accepted_at > now() - interval '14 days' and accepted_at <= now() - interval '7 days'),
    'north_star_weekly', (
      select coalesce(jsonb_agg(jsonb_build_object('week', to_char(w, 'YYYY-MM-DD'), 'accepted', c) order by w), '[]'::jsonb)
      from (
        select gs as w,
          (select count(*) from contacts where accepted_at >= gs and accepted_at < gs + interval '7 days') as c
        from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') gs
      ) weeks
    ),
    'funnel', jsonb_build_object(
      'signed_up', (select count(*) from profiles),
      'onboarded', (select count(*) from profiles where onboarded),
      'got_suggestions', (select count(distinct user_id) from suggestions),
      'saved_contact', (select count(distinct user_id) from contacts),
      'reached_out', (select count(distinct user_id) from contacts where reached_out_at is not null),
      'got_accepted', (select count(distinct user_id) from contacts where accepted_at is not null),
      'had_chat', (select count(distinct user_id) from contacts where completed_at is not null)
    ),
    'avg_contacts_per_active_user', (
      select coalesce(round(avg(n)::numeric, 1), 0) from (select count(*) n from contacts group by user_id) t
    ),
    'avg_features_per_user', (
      select coalesce(round(avg(n)::numeric, 1), 0) from (
        select count(distinct name) n from events
        where name in ('resume_parsed', 'suggestions_generated', 'message_generated', 'prep_generated', 'status_changed')
        group by user_id
      ) t
    ),
    'feature_users', (
      select coalesce(jsonb_object_agg(name, users), '{}'::jsonb)
      from (select name, count(distinct user_id) users from events group by name) t
    ),
    'nps', (
      select jsonb_build_object(
        'responses', count(*),
        'score', case when count(*) = 0 then null
          else round(100.0 * (count(*) filter (where score >= 9) - count(*) filter (where score <= 6)) / count(*)) end
      ) from feedback where kind = 'nps'
    ),
    'waitlist', (
      select coalesce(jsonb_object_agg(context, n), '{}'::jsonb)
      from (select context, count(distinct user_id) n from feedback where kind = 'waitlist' group by context) t
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.product_metrics() from public, anon;
grant execute on function public.product_metrics() to authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
