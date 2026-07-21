#!/usr/bin/env bash
# Sets up a throwaway local Postgres database, applies every migration in
# order, then runs supabase/tests/place_order_test.sql against it. Exits
# non-zero if any migration or check fails — safe to wire into CI.
#
# Requires a local Postgres server reachable via `psql` (e.g.
# `apt-get install postgresql`, `brew install postgresql`, or point
# PGHOST/PGUSER/PGPASSWORD at any Postgres you're allowed to create
# databases on — never point this at a production database).
set -euo pipefail

DB_NAME="atlas_ci_test_$$"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"
PSQL="${PSQL:-psql}"

cleanup() {
  $PSQL -v ON_ERROR_STOP=0 -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" postgres >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Creating test database $DB_NAME"
$PSQL -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\";" postgres

echo "==> Stubbing Supabase's auth schema (real Supabase provides this — we fake"
echo "    the minimum needed: auth.users and auth.uid() matching its real"
echo "    implementation, so RLS/policies behave the same as in production)"
$PSQL -v ON_ERROR_STOP=1 -d "$DB_NAME" <<'SQL'
create extension if not exists pgcrypto;
create schema if not exists auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
SQL

echo "==> Applying migrations"
for f in "$MIGRATIONS_DIR"/*.sql; do
  echo "    - $(basename "$f")"
  $PSQL -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$f" >/dev/null
done

echo "==> Running regression checks"
$PSQL -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SCRIPT_DIR/place_order_test.sql"
$PSQL -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SCRIPT_DIR/gift_card_test.sql"
$PSQL -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SCRIPT_DIR/loyalty_redemption_test.sql"
$PSQL -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SCRIPT_DIR/loyalty_expiry_test.sql"
$PSQL -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SCRIPT_DIR/signup_welcome_and_phone_test.sql"

echo "==> All checks passed"
