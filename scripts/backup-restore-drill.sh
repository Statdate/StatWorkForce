#!/usr/bin/env bash
set -euo pipefail

required=(DATABASE_URL RESTORE_DATABASE_URL)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: $name is required." >&2
    exit 1
  fi
done

if [[ "$DATABASE_URL" == "$RESTORE_DATABASE_URL" ]]; then
  echo "ERROR: source and restore database URLs must be different." >&2
  exit 1
fi

if [[ "${ACKNOWLEDGE_RESTORE_TARGET_REPLACEMENT:-}" != "YES" ]]; then
  echo "ERROR: set ACKNOWLEDGE_RESTORE_TARGET_REPLACEMENT=YES to confirm the restore target may be replaced." >&2
  exit 1
fi

for command_name in pg_dump pg_restore psql; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: $command_name is required (install the PostgreSQL client tools)." >&2
    exit 1
  fi
done

drill_dir="$(mktemp -d)"
dump_file="$drill_dir/statworkforce.dump"
cleanup() { rm -rf -- "$drill_dir"; }
trap cleanup EXIT

started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Backup/restore drill started at $started_at. Database URLs will not be printed."

pg_dump --format=custom --no-owner --no-acl --file="$dump_file" "$DATABASE_URL"
psql "$RESTORE_DATABASE_URL" --set=ON_ERROR_STOP=1 \
  --command='DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'
pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" "$dump_file"

source_tables="$(psql "$DATABASE_URL" --tuples-only --no-align --command="SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")"
restored_tables="$(psql "$RESTORE_DATABASE_URL" --tuples-only --no-align --command="SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")"
source_migrations="$(psql "$DATABASE_URL" --tuples-only --no-align --command='SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;')"
restored_migrations="$(psql "$RESTORE_DATABASE_URL" --tuples-only --no-align --command='SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;')"

if [[ "$source_tables" != "$restored_tables" || "$source_migrations" != "$restored_migrations" ]]; then
  echo "ERROR: restored metadata does not match the source." >&2
  echo "Source/restored tables: $source_tables/$restored_tables" >&2
  echo "Source/restored migrations: $source_migrations/$restored_migrations" >&2
  exit 1
fi

finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Backup/restore drill passed at $finished_at."
echo "Source/restored tables: $source_tables/$restored_tables"
echo "Source/restored migrations: $source_migrations/$restored_migrations"
