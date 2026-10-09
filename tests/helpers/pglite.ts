/**
 * In-process Postgres (PGlite) with a minimal stand-in for the parts of
 * Supabase our migrations depend on (auth.users, auth.uid(), storage, API
 * roles). Lets us apply every real migration and exercise RLS, triggers and
 * SQL functions in unit-test time without Docker or a hosted database.
 *
 * It is not a replacement for the hosted integration tests (PostgREST,
 * concurrency across connections), which live in tests/integration.
 */
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const SUPABASE_STUB = /* sql */ `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create schema extensions;
  create schema storage;
  create schema cron;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id), name text
  );
  alter table storage.objects enable row level security;

  -- Stand-in for pg_cron: records schedules instead of running them.
  create table cron.job (jobname text primary key, schedule text, command text);
  create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint
    language sql as $$
      insert into cron.job values (p_name, p_schedule, p_command)
      on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command;
      select 1::bigint;
    $$;
  create function cron.unschedule(p_name text) returns boolean
    language sql as $$ delete from cron.job where jobname = p_name returning true $$;

  grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant select on storage.objects to anon, authenticated;

  -- Mirror Supabase's default grants so our migrations' revokes are meaningful.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function createTestDb(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pg_trgm } });
  await db.exec(SUPABASE_STUB);
  for (const file of migrationFiles()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await db.exec(sql);
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
  return db;
}

/** Creates an auth user (the signup trigger creates the profile). */
export async function createUser(
  db: PGlite,
  email: string,
  meta: Record<string, unknown> = {},
): Promise<string> {
  await asSuperuser(db);
  const res = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(meta)],
  );
  return res.rows[0].id;
}

export async function makeAdmin(db: PGlite, userId: string): Promise<void> {
  await asSuperuser(db);
  await db.query("update public.profiles set role = 'admin' where id = $1", [userId]);
}

/** Subsequent queries run as the given API role, like a PostgREST request. */
export async function asUser(db: PGlite, userId: string): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("set role authenticated");
}

export async function asAnon(db: PGlite): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  await db.exec("set role anon");
}

export async function asServiceRole(db: PGlite): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  await db.exec("set role service_role");
}

export async function asSuperuser(db: PGlite): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
}
