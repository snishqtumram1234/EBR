-- Users: profiles, addresses. Role lives on profiles and is never user-editable.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (char_length(full_name) <= 120),
  phone       text check (phone ~ '^[6-9][0-9]{9}$'),
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role) where role = 'admin';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Single source of truth for "is the caller an admin". Used by RLS policies
-- and by server code (via rpc) before admin actions.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Belt and braces on top of column privileges: API roles can never change role.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') then
    raise exception 'role cannot be changed' using errcode = '42501';
  end if;
  if new.id is distinct from old.id then
    raise exception 'id cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- One profile row per auth user, created at signup. Role is always 'customer';
-- anything in user metadata is ignored for role purposes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
begin
  if v_phone is not null and v_phone !~ '^[6-9][0-9]{9}$' then
    v_phone := null;
  end if;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120),
    v_phone,
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------
create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 120),
  phone       text not null check (phone ~ '^[6-9][0-9]{9}$'),
  house       text not null check (char_length(house) between 1 and 200),
  street      text not null check (char_length(street) between 1 and 200),
  landmark    text check (char_length(landmark) <= 200),
  city        text not null check (char_length(city) between 1 and 100),
  state       text not null check (char_length(state) between 1 and 100),
  pincode     text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses (user_id);
create unique index addresses_one_default_per_user on public.addresses (user_id) where is_default;

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- Keep exactly one default: setting a new default clears the old one; the
-- first address a user adds becomes the default automatically.
create or replace function public.addresses_manage_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be changed' using errcode = '42501';
  end if;

  -- Rows touched by this trigger's own maintenance updates pass straight through.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- The default can only move by choosing another address as default.
  if tg_op = 'UPDATE' and old.is_default and not new.is_default then
    new.is_default := true;
  end if;

  if not new.is_default and not exists (
    select 1 from public.addresses
    where user_id = new.user_id and id <> new.id
  ) then
    new.is_default := true;
  end if;

  if new.is_default then
    update public.addresses
       set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;

create trigger addresses_manage_default
  before insert or update on public.addresses
  for each row execute function public.addresses_manage_default();

-- Deleting the default address promotes the most recently created remaining one.
create or replace function public.addresses_promote_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_default then
    update public.addresses
       set is_default = true
     where id = (
       select id from public.addresses
       where user_id = old.user_id
       order by created_at desc
       limit 1
     );
  end if;
  return null;
end;
$$;

create trigger addresses_promote_default
  after delete on public.addresses
  for each row execute function public.addresses_promote_default();
